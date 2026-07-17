import { component$, $ } from "@builder.io/qwik";
import { routeLoader$, routeAction$, Form, type DocumentHead } from "@builder.io/qwik-city";
import { getTasks, addTask } from "../../db";

export const useTasksLoader = routeLoader$(() => {
  return getTasks();
});

export const useAddTaskAction = routeAction$((data) => {
  const title = data.title as string;
  if (title && title.trim()) {
    addTask(title.trim());
  }
  return { success: true };
});

export default component$(() => {
  const tasksSignal = useTasksLoader();
  const addTaskAction = useAddTaskAction();

  const handleMove = $(async (taskId: number, targetColumn: string, targetPosition: number) => {
    const res = await fetch("/kanban/move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        taskId,
        targetColumn,
        targetPosition,
      }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      const err = await res.json();
      alert(`Error moving task: ${err.error}`);
    }
  });

  const columns = ["TODO", "IN_PROGRESS", "DONE"] as const;

  return (
    <div class="kanban-container">
      <header>
        <h1>Qwik Kanban Board</h1>
        <Form id="add-task-form" action={addTaskAction} class="add-form">
          <input
            type="text"
            name="title"
            placeholder="Enter task title..."
            required
            class="add-input"
          />
          <button type="submit" class="add-btn">Add Task</button>
        </Form>
      </header>

      <div class="board">
        {columns.map((colName) => {
          const columnTasks = tasksSignal.value.filter(
            (t) => t.column === colName
          );

          return (
            <div
              key={colName}
              class="column"
              data-column={colName}
              onDragOver$={(e) => {
                e.preventDefault();
              }}
              onDrop$={async (e) => {
                e.preventDefault();
                const taskIdStr = e.dataTransfer?.getData("text/plain");
                if (!taskIdStr) return;
                const taskId = Number(taskIdStr);

                const columnEl = e.currentTarget as HTMLDivElement;
                const taskItems = Array.from(columnEl.querySelectorAll(".task-item"));
                let targetPosition = taskItems.length;

                const clientY = e.clientY;
                for (let i = 0; i < taskItems.length; i++) {
                  const rect = taskItems[i].getBoundingClientRect();
                  const middle = rect.top + rect.height / 2;
                  if (clientY < middle) {
                    targetPosition = i;
                    break;
                  }
                }

                const draggedTask = tasksSignal.value.find(t => t.id === taskId);
                if (draggedTask) {
                  if (draggedTask.column === colName) {
                    if (targetPosition >= taskItems.length) {
                      targetPosition = taskItems.length - 1;
                    }
                  }
                }

                await handleMove(taskId, colName, targetPosition);
              }}
            >
              <h2 class="column-title">{colName} ({columnTasks.length})</h2>
              <div class="task-list">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    class="task-item"
                    data-task-id={task.id}
                    draggable={true}
                    onDragStart$={(e) => {
                      e.dataTransfer?.setData("text/plain", String(task.id));
                    }}
                  >
                    <div class="task-title">{task.title}</div>
                    <div class="task-meta">Position: {task.position}</div>
                    
                    <div class="task-actions">
                      <div class="move-control">
                        <select
                          value={task.column}
                          onChange$={async (e) => {
                            const select = e.target as HTMLSelectElement;
                            const targetCol = select.value;
                            const targetColTasks = tasksSignal.value.filter(
                              (t) => t.column === targetCol
                            );
                            let targetPos = targetColTasks.length;
                            if (task.column === targetCol) {
                              targetPos = targetColTasks.length - 1;
                            }
                            await handleMove(task.id, targetCol, targetPos);
                          }}
                          class="col-select"
                        >
                          <option value="TODO">TODO</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="DONE">DONE</option>
                        </select>

                        <div class="pos-control">
                          <input
                            type="number"
                            min="0"
                            value={task.position}
                            onChange$={async (e) => {
                              const input = e.target as HTMLInputElement;
                              const targetPos = Number(input.value);
                              if (!isNaN(targetPos)) {
                                await handleMove(task.id, task.column, targetPos);
                              }
                            }}
                            class="pos-input"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Qwik Kanban Board",
  meta: [
    {
      name: "description",
      content: "A Qwik Kanban Board with SQLite reordering backend",
    },
  ],
};
