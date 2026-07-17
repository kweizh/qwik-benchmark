import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { db, type Task } from '../../db';

export const useTasks = routeLoader$(() => {
  const tasks = db.prepare('SELECT id, title, column, position FROM tasks ORDER BY column ASC, position ASC').all() as Task[];
  return tasks;
});

export default component$(() => {
  const tasksSig = useTasks();
  const tasks = useSignal<Task[]>(tasksSig.value);

  // Keep tasks signal in sync with server loader when page reloads or loads
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => tasksSig.value);
    tasks.value = tasksSig.value;
  });

  const handleAdd = $(async (e: Event) => {
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const title = formData.get('title') as string;
    if (!title || !title.trim()) return;

    const res = await fetch('/kanban/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (res.ok) {
      const newTask = await res.json();
      tasks.value = [...tasks.value, newTask];
      form.reset();
    }
  });

  const handleMove = $(async (taskId: number, targetColumn: 'TODO' | 'IN_PROGRESS' | 'DONE', targetPosition: number) => {
    const res = await fetch('/kanban/move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId, targetColumn, targetPosition }),
    });

    if (res.ok) {
      const tasksRes = await fetch('/kanban/tasks');
      if (tasksRes.ok) {
        tasks.value = await tasksRes.json();
      }
    }
  });

  const COLUMNS = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

  return (
    <div class="kanban-wrapper">
      <header class="kanban-header">
        <h1>Qwik Kanban Board</h1>
        
        <form id="add-task-form" preventdefault:submit onSubmit$={handleAdd} class="add-task-form">
          <input
            type="text"
            name="title"
            placeholder="Enter task title..."
            required
            class="task-input"
          />
          <button type="submit" class="submit-btn">Add Task</button>
        </form>
      </header>

      <div class="kanban-board">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.value
            .filter((t) => t.column === col)
            .sort((a, b) => a.position - b.position);

          return (
            <div
              key={col}
              class="column-container"
              data-column={col}
              preventdefault:dragover
              preventdefault:drop
              onDrop$={async (e) => {
                const taskIdStr = e.dataTransfer?.getData('text/plain');
                if (!taskIdStr) return;
                const taskId = Number(taskIdStr);
                if (isNaN(taskId)) return;
                
                // Find if the task is already in this column
                const task = tasks.value.find(t => t.id === taskId);
                if (task && task.column === col) {
                  // If moving within the same column to the end
                  handleMove(taskId, col, columnTasks.length - 1);
                } else {
                  handleMove(taskId, col, columnTasks.length);
                }
              }}
            >
              <div class="column-header">
                <h2>{col} <span class="task-count">({columnTasks.length})</span></h2>
              </div>
              
              <div class="column-body">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    class="task-item"
                    data-task-id={task.id}
                    draggable={true}
                    onDragStart$={(e) => {
                      e.dataTransfer?.setData('text/plain', String(task.id));
                    }}
                    preventdefault:dragover
                    preventdefault:drop
                    stoppropagation:drop
                    onDrop$={async (e) => {
                      const taskIdStr = e.dataTransfer?.getData('text/plain');
                      if (!taskIdStr) return;
                      const taskId = Number(taskIdStr);
                      if (isNaN(taskId) || taskId === task.id) return;

                      handleMove(taskId, col, task.position);
                    }}
                  >
                    <div class="task-title">{task.title}</div>
                    
                    <div class="task-controls">
                      {col !== 'TODO' && (
                        <button
                          type="button"
                          class="control-btn prev-btn"
                          title="Move Left"
                          onClick$={() => {
                            const targetCol = col === 'DONE' ? 'IN_PROGRESS' : 'TODO';
                            const targetPos = tasks.value.filter(t => t.column === targetCol).length;
                            handleMove(task.id, targetCol, targetPos);
                          }}
                        >
                          ◀
                        </button>
                      )}
                      
                      {task.position > 0 && (
                        <button
                          type="button"
                          class="control-btn up-btn"
                          title="Move Up"
                          onClick$={() => handleMove(task.id, col, task.position - 1)}
                        >
                          ▲
                        </button>
                      )}
                      
                      {task.position < columnTasks.length - 1 && (
                        <button
                          type="button"
                          class="control-btn down-btn"
                          title="Move Down"
                          onClick$={() => handleMove(task.id, col, task.position + 1)}
                        >
                          ▼
                        </button>
                      )}
                      
                      {col !== 'DONE' && (
                        <button
                          type="button"
                          class="control-btn next-btn"
                          title="Move Right"
                          onClick$={() => {
                            const targetCol = col === 'TODO' ? 'IN_PROGRESS' : 'DONE';
                            const targetPos = tasks.value.filter(t => t.column === targetCol).length;
                            handleMove(task.id, targetCol, targetPos);
                          }}
                        >
                          ▶
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {columnTasks.length === 0 && (
                  <div class="empty-column-placeholder">No tasks</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .kanban-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          color: #333;
        }

        .kanban-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
          text-align: center;
        }

        .kanban-header h1 {
          margin: 0;
          font-size: 2.5rem;
          font-weight: 800;
          color: #1a202c;
        }

        .add-task-form {
          display: flex;
          width: 100%;
          max-width: 500px;
          gap: 0.5rem;
        }

        .task-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .task-input:focus {
          border-color: #3182ce;
        }

        .submit-btn {
          padding: 0.75rem 1.5rem;
          background-color: #3182ce;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .submit-btn:hover {
          background-color: #2b6cb0;
        }

        .kanban-board {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          align-items: start;
        }

        .column-container {
          background-color: #f7fafc;
          border: 2px solid #edf2f7;
          border-radius: 12px;
          padding: 1.25rem;
          min-height: 500px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .column-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #4a5568;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #edf2f7;
        }

        .task-count {
          font-size: 1rem;
          color: #a0aec0;
          font-weight: 500;
        }

        .column-body {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex: 1;
        }

        .task-item {
          background-color: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
          cursor: grab;
          transition: transform 0.15s, box-shadow 0.15s;
          user-select: none;
        }

        .task-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);
        }

        .task-item:active {
          cursor: grabbing;
        }

        .task-title {
          font-size: 1rem;
          font-weight: 500;
          color: #2d3748;
          word-break: break-word;
          margin-bottom: 0.75rem;
        }

        .task-controls {
          display: flex;
          gap: 0.35rem;
          justify-content: flex-end;
        }

        .control-btn {
          width: 28px;
          height: 28px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background-color: #edf2f7;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          color: #4a5568;
          transition: background-color 0.15s, color 0.15s;
        }

        .control-btn:hover {
          background-color: #cbd5e0;
          color: #1a202c;
        }

        .empty-column-placeholder {
          text-align: center;
          color: #a0aec0;
          padding: 2rem 0;
          border: 2px dashed #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Qwik Kanban Board',
  meta: [
    {
      name: 'description',
      content: 'Interactive Qwik Kanban Board with SQLite reordering backend',
    },
  ],
};
