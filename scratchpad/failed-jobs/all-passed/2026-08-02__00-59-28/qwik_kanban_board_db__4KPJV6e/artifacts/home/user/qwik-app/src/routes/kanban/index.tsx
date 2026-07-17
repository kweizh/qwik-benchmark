import { component$, useSignal, $ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export interface Task {
  id: number;
  title: string;
  column: "TODO" | "IN_PROGRESS" | "DONE";
  position: number;
}

export const useTasksLoader = routeLoader$(async () => {
  const { getDb } = await import("../../db");
  const db = getDb();
  const tasks = db
    .prepare(
      "SELECT id, title, column, position FROM tasks ORDER BY column, position ASC"
    )
    .all() as Task[];
  return tasks;
});

export default component$(() => {
  const tasksSignal = useTasksLoader();

  // Use a local signal for optimistic UI updates during drag-and-drop
  const tasks = useSignal<Task[]>(tasksSignal.value);

  const handleDragStart = $((e: DragEvent) => {
    const target = e.target as HTMLElement;
    const taskItem = target.closest(".task-item") as HTMLElement;
    if (taskItem) {
      e.dataTransfer!.setData("text/plain", taskItem.dataset.taskId!);
      e.dataTransfer!.effectAllowed = "move";
      taskItem.classList.add("dragging");
    }
  });

  const handleDragEnd = $((e: DragEvent) => {
    const target = e.target as HTMLElement;
    const taskItem = target.closest(".task-item") as HTMLElement;
    if (taskItem) {
      taskItem.classList.remove("dragging");
    }
  });

  const handleDragOver = $((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
  });

  const handleDrop = $(async (e: DragEvent, targetColumn: string) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer!.getData("text/plain"));
    const columnEl = (e.target as HTMLElement).closest(
      "[data-column]"
    ) as HTMLElement;
    if (!columnEl) return;

    const taskItems = Array.from(
      columnEl.querySelectorAll(".task-item:not(.dragging)")
    );

    // Determine target position based on drop location
    const dropY = e.clientY;
    let targetPosition = 0;

    if (taskItems.length === 0) {
      targetPosition = 0;
    } else {
      let placed = false;
      for (let i = 0; i < taskItems.length; i++) {
        const rect = taskItems[i].getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (dropY < midY) {
          targetPosition = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        targetPosition = taskItems.length;
      }
    }

    // Send move request
    const resp = await fetch("/kanban/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        targetColumn,
        targetPosition,
      }),
    });

    if (resp.ok) {
      // Refresh tasks
      const tasksResp = await fetch("/kanban/tasks");
      const updatedTasks = await tasksResp.json();
      tasks.value = updatedTasks;
    }
  });

  const columns = ["TODO", "IN_PROGRESS", "DONE"] as const;

  return (
    <div class="kanban-container">
      <h1>Kanban Board</h1>

      <form id="add-task-form" method="post" action="/kanban/add">
        <input
          type="text"
          name="title"
          placeholder="Enter task title..."
          required
        />
        <button type="submit">Add Task</button>
      </form>

      <div class="kanban-board">
        {columns.map((col) => (
          <div
            key={col}
            class="kanban-column"
            data-column={col}
            onDragOver$={handleDragOver}
            onDrop$={(e) => handleDrop(e, col)}
          >
            <h2>
              {col === "TODO"
                ? "To Do"
                : col === "IN_PROGRESS"
                  ? "In Progress"
                  : "Done"}
            </h2>
            <div class="task-list">
              {tasks.value
                .filter((t) => t.column === col)
                .map((task) => (
                  <div
                    key={task.id}
                    class="task-item"
                    data-task-id={task.id}
                    draggable="true"
                    onDragStart$={handleDragStart}
                    onDragEnd$={handleDragEnd}
                  >
                    {task.title}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .kanban-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: system-ui, sans-serif;
        }

        h1 {
          text-align: center;
          margin-bottom: 20px;
        }

        #add-task-form {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          justify-content: center;
        }

        #add-task-form input {
          padding: 10px 15px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 14px;
          width: 300px;
        }

        #add-task-form button {
          padding: 10px 20px;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        #add-task-form button:hover {
          background: #0052a3;
        }

        .kanban-board {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .kanban-column {
          background: #f0f2f5;
          border-radius: 8px;
          padding: 16px;
          min-height: 300px;
        }

        .kanban-column h2 {
          margin: 0 0 12px 0;
          font-size: 16px;
          text-align: center;
          color: #333;
          padding-bottom: 8px;
          border-bottom: 2px solid #ddd;
        }

        .task-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .task-item {
          background: white;
          padding: 12px 16px;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: grab;
          transition: box-shadow 0.2s, transform 0.1s;
          user-select: none;
        }

        .task-item:hover {
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        .task-item.dragging {
          opacity: 0.5;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
});
