import { component$, useSignal, $ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { db, type Task } from '../../db';

export const useTasksLoader = routeLoader$(() => {
  const tasks = db.prepare('SELECT id, title, column, position FROM tasks ORDER BY column ASC, position ASC').all() as Task[];
  return tasks;
});

export default component$(() => {
  const initialTasks = useTasksLoader();
  const tasksSignal = useSignal<Task[]>(initialTasks.value);

  const fetchTasks = $(async () => {
    const res = await fetch('/kanban/tasks');
    if (res.ok) {
      tasksSignal.value = await res.json();
    }
  });

  const handleAdd = $(async (event: Event, element: HTMLFormElement) => {
    event.preventDefault();
    const formData = new FormData(element);
    const title = formData.get('title') as string;
    if (!title || !title.trim()) return;

    const res = await fetch('/kanban/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: title.trim() }),
    });

    if (res.ok) {
      element.reset();
      await fetchTasks();
    }
  });

  const handleMove = $(async (taskId: number, targetColumn: 'TODO' | 'IN_PROGRESS' | 'DONE', targetPosition: number) => {
    const res = await fetch('/kanban/move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        targetColumn,
        targetPosition,
      }),
    });

    if (res.ok) {
      await fetchTasks();
    }
  });

  const handleDragStart = $((event: DragEvent, taskId: number) => {
    event.dataTransfer?.setData('text/plain', String(taskId));
  });

  const handleDragOver = $((event: DragEvent) => {
    event.preventDefault();
  });

  const handleDrop = $(async (event: DragEvent, targetColumn: 'TODO' | 'IN_PROGRESS' | 'DONE', targetPosition?: number) => {
    event.preventDefault();
    const taskIdStr = event.dataTransfer?.getData('text/plain');
    if (!taskIdStr) return;
    const taskId = Number(taskIdStr);
    if (isNaN(taskId)) return;

    const columnTasks = tasksSignal.value
      .filter((t) => t.column === targetColumn)
      .sort((a, b) => a.position - b.position);

    const draggedTask = tasksSignal.value.find((t) => t.id === taskId);
    const isSameColumn = draggedTask?.column === targetColumn;

    let pos = targetPosition;
    if (pos === undefined) {
      pos = isSameColumn ? columnTasks.length - 1 : columnTasks.length;
      if (pos < 0) pos = 0;
    }

    await handleMove(taskId, targetColumn, pos);
  });

  // Filter and sort tasks for each column
  const todoTasks = tasksSignal.value
    .filter((t) => t.column === 'TODO')
    .sort((a, b) => a.position - b.position);

  const inProgressTasks = tasksSignal.value
    .filter((t) => t.column === 'IN_PROGRESS')
    .sort((a, b) => a.position - b.position);

  const doneTasks = tasksSignal.value
    .filter((t) => t.column === 'DONE')
    .sort((a, b) => a.position - b.position);

  return (
    <div class="kanban-container">
      <header>
        <h1>Qwik Kanban Board</h1>
        <p>Drag and drop tasks or use the controls to reorder them.</p>
      </header>

      <form id="add-task-form" onSubmit$={handleAdd}>
        <input
          type="text"
          name="title"
          placeholder="Enter task title..."
          required
          autoComplete="off"
        />
        <button type="submit">Add Task</button>
      </form>

      <div class="board">
        {/* TODO Column */}
        <div
          class="column"
          data-column="TODO"
          onDragOver$={handleDragOver}
          onDrop$={(e) => handleDrop(e, 'TODO')}
        >
          <div class="column-header">
            <span>To Do</span>
            <span class="column-count">{todoTasks.length}</span>
          </div>
          <div class="column-body">
            {todoTasks.map((task) => (
              <div
                key={task.id}
                class="task-item"
                data-task-id={task.id}
                draggable={true}
                onDragStart$={(e) => handleDragStart(e, task.id)}
                onDragOver$={handleDragOver}
                onDrop$={(e) => {
                  e.stopPropagation();
                  handleDrop(e, 'TODO', task.position);
                }}
              >
                <div class="task-title">{task.title}</div>
                <div class="task-controls">
                  <div class="btn-group">
                    <button
                      class="control-btn"
                      disabled={task.position === 0}
                      onClick$={() => handleMove(task.id, 'TODO', task.position - 1)}
                      title="Move Up"
                    >
                      ↑
                    </button>
                    <button
                      class="control-btn"
                      disabled={task.position === todoTasks.length - 1}
                      onClick$={() => handleMove(task.id, 'TODO', task.position + 1)}
                      title="Move Down"
                    >
                      ↓
                    </button>
                  </div>
                  <div class="btn-group">
                    <button
                      class="control-btn"
                      onClick$={() => handleMove(task.id, 'IN_PROGRESS', inProgressTasks.length)}
                      title="Move to In Progress"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* IN_PROGRESS Column */}
        <div
          class="column"
          data-column="IN_PROGRESS"
          onDragOver$={handleDragOver}
          onDrop$={(e) => handleDrop(e, 'IN_PROGRESS')}
        >
          <div class="column-header">
            <span>In Progress</span>
            <span class="column-count">{inProgressTasks.length}</span>
          </div>
          <div class="column-body">
            {inProgressTasks.map((task) => (
              <div
                key={task.id}
                class="task-item"
                data-task-id={task.id}
                draggable={true}
                onDragStart$={(e) => handleDragStart(e, task.id)}
                onDragOver$={handleDragOver}
                onDrop$={(e) => {
                  e.stopPropagation();
                  handleDrop(e, 'IN_PROGRESS', task.position);
                }}
              >
                <div class="task-title">{task.title}</div>
                <div class="task-controls">
                  <div class="btn-group">
                    <button
                      class="control-btn"
                      disabled={task.position === 0}
                      onClick$={() => handleMove(task.id, 'IN_PROGRESS', task.position - 1)}
                      title="Move Up"
                    >
                      ↑
                    </button>
                    <button
                      class="control-btn"
                      disabled={task.position === inProgressTasks.length - 1}
                      onClick$={() => handleMove(task.id, 'IN_PROGRESS', task.position + 1)}
                      title="Move Down"
                    >
                      ↓
                    </button>
                  </div>
                  <div class="btn-group">
                    <button
                      class="control-btn"
                      onClick$={() => handleMove(task.id, 'TODO', todoTasks.length)}
                      title="Move to To Do"
                    >
                      ←
                    </button>
                    <button
                      class="control-btn"
                      onClick$={() => handleMove(task.id, 'DONE', doneTasks.length)}
                      title="Move to Done"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DONE Column */}
        <div
          class="column"
          data-column="DONE"
          onDragOver$={handleDragOver}
          onDrop$={(e) => handleDrop(e, 'DONE')}
        >
          <div class="column-header">
            <span>Done</span>
            <span class="column-count">{doneTasks.length}</span>
          </div>
          <div class="column-body">
            {doneTasks.map((task) => (
              <div
                key={task.id}
                class="task-item"
                data-task-id={task.id}
                draggable={true}
                onDragStart$={(e) => handleDragStart(e, task.id)}
                onDragOver$={handleDragOver}
                onDrop$={(e) => {
                  e.stopPropagation();
                  handleDrop(e, 'DONE', task.position);
                }}
              >
                <div class="task-title">{task.title}</div>
                <div class="task-controls">
                  <div class="btn-group">
                    <button
                      class="control-btn"
                      disabled={task.position === 0}
                      onClick$={() => handleMove(task.id, 'DONE', task.position - 1)}
                      title="Move Up"
                    >
                      ↑
                    </button>
                    <button
                      class="control-btn"
                      disabled={task.position === doneTasks.length - 1}
                      onClick$={() => handleMove(task.id, 'DONE', task.position + 1)}
                      title="Move Down"
                    >
                      ↓
                    </button>
                  </div>
                  <div class="btn-group">
                    <button
                      class="control-btn"
                      onClick$={() => handleMove(task.id, 'IN_PROGRESS', inProgressTasks.length)}
                      title="Move to In Progress"
                    >
                      ←
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
