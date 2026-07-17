import { component$, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";
import { routeLoader$, server$, type DocumentHead } from "@builder.io/qwik-city";
import { db } from "../../lib/db";

// Loader to get initial server-rendered data
export const useDashboardData = routeLoader$(async () => {
  try {
    const tasks = db.prepare("SELECT * FROM tasks").all() as any[];
    const history = db.prepare(`
      SELECT h.id, h.task_id, h.status, h.timestamp, t.name as task_name
      FROM execution_history h
      JOIN tasks t ON h.task_id = t.id
      ORDER BY h.timestamp DESC
      LIMIT 50
    `).all() as any[];
    return { tasks, history };
  } catch (err) {
    console.error("Error loading dashboard data:", err);
    return { tasks: [], history: [] };
  }
});

// RPC to fetch global history from client side
const fetchGlobalHistory = server$(async () => {
  try {
    return db.prepare(`
      SELECT h.id, h.task_id, h.status, h.timestamp, t.name as task_name
      FROM execution_history h
      JOIN tasks t ON h.task_id = t.id
      ORDER BY h.timestamp DESC
      LIMIT 50
    `).all() as any[];
  } catch (err) {
    console.error("Error fetching global history in RPC:", err);
    return [];
  }
});

// Timezone-safe UTC formatter to prevent Qwik hydration mismatch
const formatTimestamp = (timestampStr: string) => {
  try {
    const d = new Date(timestampStr);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
  } catch {
    return timestampStr;
  }
};

export default component$(() => {
  const initialData = useDashboardData();
  const tasks = useSignal(initialData.value.tasks);
  const history = useSignal(initialData.value.history);

  // Form signals
  const formId = useSignal("");
  const formName = useSignal("");
  const formCommand = useSignal("");
  const formInterval = useSignal("5");
  const formStatus = useSignal("ACTIVE");

  const errorMessage = useSignal<string | null>(null);
  const successMessage = useSignal<string | null>(null);

  const refreshData = $(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        tasks.value = await res.json();
      }
      const hist = await fetchGlobalHistory();
      history.value = hist;
    } catch (err) {
      console.error("Error refreshing dashboard data:", err);
    }
  });

  const handlePause = $(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/pause`, { method: "POST" });
      if (res.ok) {
        successMessage.value = `Task '${id}' paused successfully.`;
        errorMessage.value = null;
        await refreshData();
      } else {
        const data = await res.json();
        errorMessage.value = data.error || "Failed to pause task.";
        successMessage.value = null;
      }
    } catch (err: any) {
      errorMessage.value = err.message;
      successMessage.value = null;
    }
  });

  const handleResume = $(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/resume`, { method: "POST" });
      if (res.ok) {
        successMessage.value = `Task '${id}' resumed successfully.`;
        errorMessage.value = null;
        await refreshData();
      } else {
        const data = await res.json();
        errorMessage.value = data.error || "Failed to resume task.";
        successMessage.value = null;
      }
    } catch (err: any) {
      errorMessage.value = err.message;
      successMessage.value = null;
    }
  });

  const handleTrigger = $(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/trigger`, { method: "POST" });
      if (res.ok) {
        successMessage.value = `Task '${id}' triggered successfully in background.`;
        errorMessage.value = null;
        await refreshData();
      } else {
        const data = await res.json();
        errorMessage.value = data.error || "Failed to trigger task.";
        successMessage.value = null;
      }
    } catch (err: any) {
      errorMessage.value = err.message;
      successMessage.value = null;
    }
  });

  const handleCreate = $(async () => {
    try {
      const body = {
        id: formId.value,
        name: formName.value,
        command: formCommand.value,
        interval_seconds: parseInt(formInterval.value, 10),
        status: formStatus.value,
      };

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        successMessage.value = `Task '${body.id}' created successfully.`;
        errorMessage.value = null;
        // Reset form
        formId.value = "";
        formName.value = "";
        formCommand.value = "";
        formInterval.value = "5";
        formStatus.value = "ACTIVE";
        await refreshData();
      } else {
        const data = await res.json();
        errorMessage.value = data.error || "Failed to create task.";
        successMessage.value = null;
      }
    } catch (err: any) {
      errorMessage.value = err.message;
      successMessage.value = null;
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const interval = setInterval(async () => {
      await refreshData();
    }, 3000);

    return () => clearInterval(interval);
  });

  return (
    <div class="container">
      <header>
        <h1>Scheduled Tasks Dashboard</h1>
        <p style={{ margin: "0.5rem 0 0 0", color: "var(--text-muted)" }}>
          Manage and monitor background scheduled jobs in real-time.
        </p>
      </header>

      {errorMessage.value && (
        <div class="alert alert-danger">
          <strong>Error:</strong> {errorMessage.value}
        </div>
      )}

      {successMessage.value && (
        <div class="alert alert-success">
          {successMessage.value}
        </div>
      )}

      <div class="dashboard-grid">
        {/* Left Side: Tasks List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div class="card">
            <h2>Active & Paused Tasks</h2>
            <div class="table-responsive">
              {tasks.value.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", margin: "2rem 0" }}>
                  No tasks configured yet. Create one on the right!
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Command</th>
                      <th>Interval</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.value.map((task: any) => (
                      <tr key={task.id}>
                        <td style={{ fontWeight: 600 }}>{task.id}</td>
                        <td>{task.name}</td>
                        <td>
                          <code style={{ background: "#f1f5f9", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>
                            {task.command}
                          </code>
                        </td>
                        <td>{task.interval_seconds}s</td>
                        <td>
                          <span
                            class={`badge ${
                              task.status === "ACTIVE" ? "badge-active" : "badge-paused"
                            }`}
                          >
                            {task.status}
                          </span>
                        </td>
                        <td>
                          <div class="btn-group">
                            {task.status === "ACTIVE" ? (
                              <button
                                class="btn btn-secondary btn-sm"
                                onClick$={() => handlePause(task.id)}
                              >
                                Pause
                              </button>
                            ) : (
                              <button
                                class="btn btn-secondary btn-sm"
                                onClick$={() => handleResume(task.id)}
                              >
                                Resume
                              </button>
                            )}
                            <button
                              class="btn btn-primary btn-sm"
                              onClick$={() => handleTrigger(task.id)}
                            >
                              Run Now
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div class="card">
            <h2>Recent Execution History</h2>
            <div class="table-responsive">
              {history.value.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", margin: "2rem 0" }}>
                  No execution history logs yet. Active tasks will execute and log here.
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Task Name</th>
                      <th>Status</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.value.map((log: any) => (
                      <tr key={log.id}>
                        <td>{log.id}</td>
                        <td style={{ fontWeight: 500 }}>{log.task_name}</td>
                        <td>
                          <span
                            class={`badge ${
                              log.status === "SUCCESS" ? "badge-success" : "badge-danger"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td>{formatTimestamp(log.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Create Task Form */}
        <div>
          <div class="card" style={{ position: "sticky", top: "2rem" }}>
            <h2>Create New Task</h2>
            <form
              onSubmit$={(e) => {
                e.preventDefault();
                handleCreate();
              }}
            >
              <div class="form-group">
                <label for="taskId">Task ID (unique slug)</label>
                <input
                  id="taskId"
                  type="text"
                  class="form-control"
                  placeholder="e.g. system-cleanup"
                  value={formId.value}
                  onInput$={(e) => (formId.value = (e.target as HTMLInputElement).value)}
                  required
                />
              </div>

              <div class="form-group">
                <label for="taskName">Human-Readable Name</label>
                <input
                  id="taskName"
                  type="text"
                  class="form-control"
                  placeholder="e.g. System Cleanup"
                  value={formName.value}
                  onInput$={(e) => (formName.value = (e.target as HTMLInputElement).value)}
                  required
                />
              </div>

              <div class="form-group">
                <label for="taskCommand">Shell Command</label>
                <input
                  id="taskCommand"
                  type="text"
                  class="form-control"
                  placeholder="e.g. echo 'Cleanup done!'"
                  value={formCommand.value}
                  onInput$={(e) => (formCommand.value = (e.target as HTMLInputElement).value)}
                  required
                />
              </div>

              <div class="form-group">
                <label for="taskInterval">Interval (seconds)</label>
                <input
                  id="taskInterval"
                  type="number"
                  min="1"
                  class="form-control"
                  value={formInterval.value}
                  onInput$={(e) => (formInterval.value = (e.target as HTMLInputElement).value)}
                  required
                />
              </div>

              <div class="form-group">
                <label for="taskStatus">Initial Status</label>
                <select
                  id="taskStatus"
                  class="form-control"
                  value={formStatus.value}
                  onChange$={(e) => (formStatus.value = (e.target as HTMLSelectElement).value)}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAUSED">PAUSED</option>
                </select>
              </div>

              <button type="submit" class="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>
                Create Task
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Scheduled Tasks Dashboard",
  meta: [
    {
      name: "description",
      content: "Qwik Scheduled Tasks Dashboard",
    },
  ],
};
