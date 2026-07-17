import { component$, useStore, useVisibleTask$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getAllTasks, getAllExecutionHistory, Task, ExecutionHistory } from '../../db/db';

export const useTasksData = routeLoader$(() => {
  const tasks = getAllTasks();
  const history = getAllExecutionHistory();
  return { tasks, history };
});

export default component$(() => {
  const initialData = useTasksData();

  const state = useStore({
    tasks: initialData.value.tasks as Task[],
    history: initialData.value.history as ExecutionHistory[],
    errorMsg: '',
    successMsg: '',
    form: {
      id: '',
      name: '',
      command: '',
      interval_seconds: 5,
      status: 'ACTIVE' as 'ACTIVE' | 'PAUSED',
    },
    isSubmitting: false,
  });

  // Client-side polling to keep tasks and history updated in real-time
  useVisibleTask$(() => {
    const interval = setInterval(async () => {
      try {
        // Fetch tasks
        const tasksRes = await fetch('/api/tasks');
        if (tasksRes.ok) {
          const tasks = (await tasksRes.json()) as Task[];
          state.tasks = tasks;

          // Fetch history for each task and merge
          const allHistory: ExecutionHistory[] = [];
          for (const task of tasks) {
            const histRes = await fetch(`/api/tasks/${task.id}/history`);
            if (histRes.ok) {
              const hist = (await histRes.json()) as ExecutionHistory[];
              allHistory.push(...hist);
            }
          }

          // Sort by timestamp descending
          allHistory.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          state.history = allHistory;
        }
      } catch (err) {
        console.error('Error polling tasks/history:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  });

  const clearMessages = () => {
    state.errorMsg = '';
    state.successMsg = '';
  };

  const handleCreateTask = async () => {
    clearMessages();
    state.isSubmitting = true;

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: state.form.id,
          name: state.form.name,
          command: state.form.command,
          interval_seconds: Number(state.form.interval_seconds),
          status: state.form.status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        state.errorMsg = data.error || 'Failed to create task';
      } else {
        state.successMsg = `Task '${data.name}' created successfully!`;
        // Reset form
        state.form = {
          id: '',
          name: '',
          command: '',
          interval_seconds: 5,
          status: 'ACTIVE',
        };

        // Immediately update state
        const tasksRes = await fetch('/api/tasks');
        if (tasksRes.ok) {
          state.tasks = await tasksRes.json();
        }
      }
    } catch (err: any) {
      state.errorMsg = err.message || 'An unexpected error occurred';
    } finally {
      state.isSubmitting = false;
    }
  };

  const handlePause = async (id: string) => {
    clearMessages();
    try {
      const res = await fetch(`/api/tasks/${id}/pause`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        state.errorMsg = data.error || 'Failed to pause task';
      } else {
        state.successMsg = `Task '${id}' paused.`;
        // Update local task status
        const idx = state.tasks.findIndex((t) => t.id === id);
        if (idx !== -1) {
          state.tasks[idx].status = 'PAUSED';
        }
      }
    } catch (err: any) {
      state.errorMsg = err.message || 'An unexpected error occurred';
    }
  };

  const handleResume = async (id: string) => {
    clearMessages();
    try {
      const res = await fetch(`/api/tasks/${id}/resume`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        state.errorMsg = data.error || 'Failed to resume task';
      } else {
        state.successMsg = `Task '${id}' resumed.`;
        // Update local task status
        const idx = state.tasks.findIndex((t) => t.id === id);
        if (idx !== -1) {
          state.tasks[idx].status = 'ACTIVE';
        }
      }
    } catch (err: any) {
      state.errorMsg = err.message || 'An unexpected error occurred';
    }
  };

  const handleTrigger = async (id: string) => {
    clearMessages();
    try {
      const res = await fetch(`/api/tasks/${id}/trigger`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        state.errorMsg = data.error || 'Failed to trigger task';
      } else {
        state.successMsg = `Task '${id}' triggered in the background.`;
      }
    } catch (err: any) {
      state.errorMsg = err.message || 'An unexpected error occurred';
    }
  };

  return (
    <div class="dashboard-container">
      {/* CSS Styles */}
      <style>{`
        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          color: #1f2937;
          background-color: #f9fafb;
          min-height: 100vh;
        }

        h1 {
          font-size: 2.25rem;
          font-weight: 800;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .subtitle {
          color: #4b5563;
          margin-bottom: 2rem;
          font-size: 1.1rem;
        }

        .alert {
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
          font-weight: 500;
        }

        .alert-success {
          background-color: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .alert-error {
          background-color: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .grid-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          margin-bottom: 2.5rem;
        }

        @media (min-width: 768px) {
          .grid-layout {
            grid-template-columns: 1fr 2fr;
          }
        }

        .card {
          background: #ffffff;
          border-radius: 0.75rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 1.25rem;
          border-bottom: 2px solid #f3f4f6;
          padding-bottom: 0.5rem;
        }

        /* Form styling */
        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.375rem;
        }

        .form-control {
          width: 100%;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          box-sizing: border-box;
          background-color: #fff;
          color: #1f2937;
          transition: border-color 0.15s ease-in-out;
        }

        .form-control:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.625rem 1.25rem;
          font-size: 0.875rem;
          font-weight: 600;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          border: none;
        }

        .btn-primary {
          background-color: #2563eb;
          color: white;
          width: 100%;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #1d4ed8;
        }

        .btn-primary:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }

        /* Action Buttons */
        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
          border-radius: 0.25rem;
          margin-right: 0.5rem;
        }

        .btn-pause {
          background-color: #f59e0b;
          color: white;
        }

        .btn-pause:hover {
          background-color: #d97706;
        }

        .btn-resume {
          background-color: #10b981;
          color: white;
        }

        .btn-resume:hover {
          background-color: #059669;
        }

        .btn-trigger {
          background-color: #3b82f6;
          color: white;
        }

        .btn-trigger:hover {
          background-color: #2563eb;
        }

        /* Task list styling */
        .task-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .task-item {
          display: flex;
          flex-direction: column;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          background-color: #f9fafb;
        }

        @media (min-width: 640px) {
          .task-item {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }

        .task-info {
          margin-bottom: 0.75rem;
        }

        @media (min-width: 640px) {
          .task-info {
            margin-bottom: 0;
          }
        }

        .task-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .task-name {
          font-weight: 700;
          font-size: 1.1rem;
          color: #111827;
        }

        .task-id {
          font-size: 0.75rem;
          color: #6b7280;
          background-color: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
        }

        .task-cmd {
          font-family: monospace;
          background-color: #f1f5f9;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.85rem;
          color: #334155;
          display: inline-block;
          margin-top: 0.25rem;
        }

        .task-meta {
          font-size: 0.825rem;
          color: #4b5563;
          margin-top: 0.25rem;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 0.125rem 0.625rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 9999px;
        }

        .badge-active {
          background-color: #d1fae5;
          color: #065f46;
        }

        .badge-paused {
          background-color: #fef3c7;
          color: #92400e;
        }

        .badge-success {
          background-color: #d1fae5;
          color: #065f46;
        }

        .badge-failed {
          background-color: #fee2e2;
          color: #991b1b;
        }

        /* Table styling */
        .table-responsive {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.875rem;
        }

        th {
          background-color: #f3f4f6;
          color: #374151;
          font-weight: 600;
          padding: 0.75rem 1rem;
          border-bottom: 2px solid #e5e7eb;
        }

        td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e5e7eb;
          color: #4b5563;
        }

        tr:hover {
          background-color: #f9fafb;
        }

        .no-data {
          color: #6b7280;
          text-align: center;
          padding: 2rem 0;
          font-style: italic;
        }
      `}</style>

      <header>
        <h1>Scheduled Tasks Dashboard</h1>
        <p class="subtitle">
          Manage and monitor your background scheduled jobs in real-time.
        </p>
      </header>

      {state.successMsg && <div class="alert alert-success">{state.successMsg}</div>}
      {state.errorMsg && <div class="alert alert-error">{state.errorMsg}</div>}

      <div class="grid-layout">
        {/* Create Task Card */}
        <div class="card">
          <h2 class="card-title">Create New Task</h2>
          <form
            preventdefault:submit
            onSubmit$={handleCreateTask}
          >
            <div class="form-group">
              <label for="id">Task ID (unique slug/UUID)</label>
              <input
                id="id"
                type="text"
                class="form-control"
                placeholder="e.g. backup-db"
                value={state.form.id}
                onInput$={(e, el) => (state.form.id = el.value)}
                required
              />
            </div>

            <div class="form-group">
              <label for="name">Task Name</label>
              <input
                id="name"
                type="text"
                class="form-control"
                placeholder="e.g. Backup Database"
                value={state.form.name}
                onInput$={(e, el) => (state.form.name = el.value)}
                required
              />
            </div>

            <div class="form-group">
              <label for="command">Shell Command</label>
              <input
                id="command"
                type="text"
                class="form-control"
                placeholder="e.g. pg_dump my_db > backup.sql"
                value={state.form.command}
                onInput$={(e, el) => (state.form.command = el.value)}
                required
              />
            </div>

            <div class="form-group">
              <label for="interval">Interval (seconds)</label>
              <input
                id="interval"
                type="number"
                min="1"
                class="form-control"
                value={state.form.interval_seconds}
                onInput$={(e, el) => (state.form.interval_seconds = Number(el.value))}
                required
              />
            </div>

            <div class="form-group">
              <label for="status">Initial Status</label>
              <select
                id="status"
                class="form-control"
                value={state.form.status}
                onChange$={(e, el) => (state.form.status = el.value as 'ACTIVE' | 'PAUSED')}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
              </select>
            </div>

            <button
              type="submit"
              class="btn btn-primary"
              disabled={state.isSubmitting}
            >
              {state.isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </form>
        </div>

        {/* Tasks List Card */}
        <div class="card">
          <h2 class="card-title">Tasks</h2>
          {state.tasks.length === 0 ? (
            <div class="no-data">No tasks configured. Create one using the form.</div>
          ) : (
            <div class="task-list">
              {state.tasks.map((task) => (
                <div
                  key={task.id}
                  class="task-item"
                >
                  <div class="task-info">
                    <div class="task-header">
                      <span class="task-name">{task.name}</span>
                      <span class="task-id">{task.id}</span>
                      <span
                        class={`badge ${task.status === 'ACTIVE' ? 'badge-active' : 'badge-paused'}`}
                      >
                        {task.status}
                      </span>
                    </div>
                    <div class="task-meta">
                      Interval: <strong>{task.interval_seconds}s</strong>
                    </div>
                    <div>
                      <code class="task-cmd">{task.command}</code>
                    </div>
                  </div>

                  <div class="task-actions">
                    {task.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        class="btn btn-sm btn-pause"
                        onClick$={() => handlePause(task.id)}
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        type="button"
                        class="btn btn-sm btn-resume"
                        onClick$={() => handleResume(task.id)}
                      >
                        Resume
                      </button>
                    )}
                    <button
                      type="button"
                      class="btn btn-sm btn-trigger"
                      onClick$={() => handleTrigger(task.id)}
                    >
                      Trigger
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Execution History Card */}
      <div class="card">
        <h2 class="card-title">Recent Execution History</h2>
        {state.history.length === 0 ? (
          <div class="no-data">No execution logs yet. Active tasks will execute periodically.</div>
        ) : (
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Task ID</th>
                  <th>Status</th>
                  <th>Timestamp (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {state.history.map((log) => (
                  <tr key={log.id}>
                    <td>{log.id}</td>
                    <td>
                      <strong>{log.task_id}</strong>
                    </td>
                    <td>
                      <span
                        class={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-failed'}`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td>{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});
