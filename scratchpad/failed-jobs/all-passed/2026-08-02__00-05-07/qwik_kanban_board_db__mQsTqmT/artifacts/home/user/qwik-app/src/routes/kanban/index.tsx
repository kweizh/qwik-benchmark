import { $, component$ } from "@builder.io/qwik";
import {
  Form,
  routeAction$,
  routeLoader$,
  z,
  zod$,
} from "@builder.io/qwik-city";
import { addTask, COLUMNS, getAllTasks, type Column } from "~/lib/db";

export const useTasks = routeLoader$(() => {
  return getAllTasks();
});

export const useAddTask = routeAction$(
  (data) => {
    const title = String(data.title ?? "").trim();
    if (!title) {
      return { success: false as const, error: "Title is required" };
    }
    const task = addTask(title);
    return { success: true as const, task };
  },
  zod$({
    title: z.string(),
  }),
);

const COLUMN_LABELS: Record<Column, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

export default component$(() => {
  const tasks = useTasks();
  const addTaskAction = useAddTask();

  return (
    <div class="kanban-board">
      <h1>Kanban Board</h1>

      <Form action={addTaskAction} id="add-task-form" class="add-task-form">
        <input
          type="text"
          name="title"
          placeholder="New task title"
          required
        />
        <button type="submit">Add Task</button>
      </Form>

      <div class="columns">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.value.filter((t) => t.column === col);
          return (
            <div
              key={col}
              class="column"
              data-column={col}
              onDragOver$={(ev: DragEvent) => {
                ev.preventDefault();
              }}
              onDrop$={$(async (ev: DragEvent) => {
                ev.preventDefault();
                const dataTransfer = ev.dataTransfer;
                const taskIdStr = dataTransfer?.getData("text/plain");
                const taskId = Number(taskIdStr);
                if (!taskId) return;

                const targetPosition = columnTasks.length;

                await fetch("/kanban/move", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    taskId,
                    targetColumn: col,
                    targetPosition,
                  }),
                });

                location.reload();
              })}
            >
              <h2>{COLUMN_LABELS[col]}</h2>
              <div class="task-list">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    class="task-item"
                    data-task-id={task.id}
                    draggable
                    onDragStart$={(ev: DragEvent) => {
                      ev.dataTransfer?.setData("text/plain", String(task.id));
                    }}
                  >
                    {task.title}
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
