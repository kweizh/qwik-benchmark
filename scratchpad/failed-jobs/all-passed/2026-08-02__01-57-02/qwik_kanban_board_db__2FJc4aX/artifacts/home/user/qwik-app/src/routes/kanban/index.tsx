import { component$, useSignal, useTask$, $ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import db, { Task } from "../../lib/db";

export const useTasksLoader = routeLoader$(() => {
  const stmt = db.prepare("SELECT id, title, column, position FROM tasks ORDER BY column ASC, position ASC");
  return stmt.all() as Task[];
});

export default component$(() => {
  const tasksLoader = useTasksLoader();
  const tasksSignal = useSignal<Task[]>([]);

  // Initialize tasks state from server loader
  useTask$(({ track }) => {
    track(() => tasksLoader.value);
    tasksSignal.value = tasksLoader.value;
  });

  // Helper to fetch tasks from API and update state
  const fetchTasks = $(async () => {
    const res = await fetch("/kanban/tasks");
    if (res.ok) {
      tasksSignal.value = await res.json();
    }
  });

  // Handle adding a new task
  const handleAddTask = $(async (event: any, element: HTMLFormElement) => {
    const formData = new FormData(element);
    const title = formData.get("title") as string;
    if (!title) return;

    const res = await fetch("/kanban/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (res.ok) {
      element.reset();
      await fetchTasks();
    } else {
      const errData = await res.json();
      alert(errData.error || "Failed to add task");
    }
  });

  // Handle moving/reordering a task
  const handleMoveTask = $(async (taskId: number, event: any, button: HTMLButtonElement) => {
    const taskItem = button.closest(".task-item");
    if (!taskItem) return;

    const select = taskItem.querySelector(".col-select") as HTMLSelectElement;
    const input = taskItem.querySelector(".pos-input") as HTMLInputElement;

    const targetColumn = select.value;
    const targetPosition = parseInt(input.value, 10);

    const res = await fetch("/kanban/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, targetColumn, targetPosition }),
    });

    if (res.ok) {
      await fetchTasks();
    } else {
      const errData = await res.json();
      alert(errData.error || "Failed to move task");
    }
  });

  const columns: ("TODO" | "IN_PROGRESS" | "DONE")[] = ["TODO", "IN_PROGRESS", "DONE"];

  return (
    <div class="kanban-container">
      <header class="kanban-header">
        <h1>Qwik Kanban Board</h1>
        <div class="add-task-box">
          <form id="add-task-form" preventdefault:submit onSubmit$={handleAddTask}>
            <input
              type="text"
              name="title"
              placeholder="What needs to be done?"
              required
              class="task-input"
            />
            <button type="submit" class="add-btn">Add Task</button>
          </form>
        </div>
      </header>

      <main class="kanban-board">
        {columns.map((colName) => {
          const colTasks = tasksSignal.value
            .filter((t) => t.column === colName)
            .sort((a, b) => a.position - b.position);

          return (
            <div key={colName} class="kanban-column" data-column={colName}>
              <div class="column-header">
                <h2>{colName}</h2>
                <span class="task-count">{colTasks.length}</span>
              </div>
              <div class="tasks-list">
                {colTasks.map((task) => (
                  <div key={task.id} class="task-item" data-task-id={task.id}>
                    <div class="task-title">{task.title}</div>
                    <div class="task-meta">Position: {task.position}</div>
                    <div class="task-actions">
                      <select class="col-select" value={task.column}>
                        <option value="TODO">TODO</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="DONE">DONE</option>
                      </select>
                      <input
                        type="number"
                        class="pos-input"
                        value={task.position}
                        min={0}
                        max={100}
                      />
                      <button
                        type="button"
                        class="move-btn"
                        onClick$={async (ev, btn) => {
                          await handleMoveTask(task.id, ev, btn);
                        }}
                      >
                        Move
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
});
