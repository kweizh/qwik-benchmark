import { component$, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { db, initRunner } from "~/lib/db";

// Ensure runner is initialized
initRunner();

export const useTasksData = routeLoader$(async () => {
  try {
    const tasks = db.prepare("SELECT * FROM tasks").all() as any[];
    const history = db
      .prepare("SELECT * FROM execution_history ORDER BY timestamp DESC, id DESC LIMIT 100")
      .all() as any[];
    return { tasks, history };
  } catch (err: any) {
    return { tasks: [], history: [], error: err.message };
  }
});

export default component$(() => {
  const initialData = useTasksData();

  const store = useStore({
    tasks: initialData.value.tasks,
    history: initialData.value.history,
    errorMsg: initialData.value.error || "",
    successMsg: "",

    // Form fields
    formId: "",
    formName: "",
    formCommand: "",
    formInterval: 5,
    formStatus: "ACTIVE" as "ACTIVE" | "PAUSED",
  });

  const refreshData = $(async () => {
    try {
      const tasksRes = await fetch("/api/tasks");
      if (tasksRes.ok) {
        store.tasks = await tasksRes.json();
      }

      // Fetch history for each task and merge/sort them
      const historyPromises = store.tasks.map(async (task: any) => {
        const res = await fetch(`/api/tasks/${task.id}/history`);
        if (res.ok) {
          return await res.json();
        }
        return [];
      });

      const histories = await Promise.all(historyPromises);
      const flatHistory = histories.flat().sort((a: any, b: any) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      store.history = flatHistory.slice(0, 100);
    } catch (err) {
      console.error("Error refreshing data:", err);
    }
  });

  const handlePause = $(async (id: string) => {
    store.errorMsg = "";
    store.successMsg = "";
    try {
      const res = await fetch(`/api/tasks/${id}/pause`, { method: "POST" });
      if (res.ok) {
        store.successMsg = `Task '${id}' paused successfully.`;
        await refreshData();
      } else {
        const data = await res.json();
        store.errorMsg = data.error || "Failed to pause task.";
      }
    } catch (err: any) {
      store.errorMsg = err.message || "An error occurred.";
    }
  });

  const handleResume = $(async (id: string) => {
    store.errorMsg = "";
    store.successMsg = "";
    try {
      const res = await fetch(`/api/tasks/${id}/resume`, { method: "POST" });
      if (res.ok) {
        store.successMsg = `Task '${id}' resumed successfully.`;
        await refreshData();
      } else {
        const data = await res.json();
        store.errorMsg = data.error || "Failed to resume task.";
      }
    } catch (err: any) {
      store.errorMsg = err.message || "An error occurred.";
    }
  });

  const handleTrigger = $(async (id: string) => {
    store.errorMsg = "";
    store.successMsg = "";
    try {
      const res = await fetch(`/api/tasks/${id}/trigger`, { method: "POST" });
      if (res.ok) {
        store.successMsg = `Task '${id}' triggered successfully.`;
        // Refresh after a short delay to let execution run
        setTimeout(async () => {
          await refreshData();
        }, 500);
      } else {
        const data = await res.json();
        store.errorMsg = data.error || "Failed to trigger task.";
      }
    } catch (err: any) {
      store.errorMsg = err.message || "An error occurred.";
    }
  });

  const handleCreate = $(async () => {
    store.errorMsg = "";
    store.successMsg = "";

    const id = store.formId.trim();
    const name = store.formName.trim();
    const command = store.formCommand.trim();
    const interval_seconds = Number(store.formInterval);
    const status = store.formStatus;

    if (!id) {
      store.errorMsg = "Task ID is required.";
      return;
    }
    if (!name) {
      store.errorMsg = "Task Name is required.";
      return;
    }
    if (!command) {
      store.errorMsg = "Shell Command is required.";
      return;
    }
    if (isNaN(interval_seconds) || interval_seconds <= 0) {
      store.errorMsg = "Interval must be an integer greater than 0.";
      return;
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          command,
          interval_seconds,
          status,
        }),
      });

      if (res.ok) {
        store.successMsg = `Task '${id}' created successfully.`;
        store.formId = "";
        store.formName = "";
        store.formCommand = "";
        store.formInterval = 5;
        store.formStatus = "ACTIVE";
        await refreshData();
      } else {
        const data = await res.json();
        store.errorMsg = data.error || "Failed to create task.";
      }
    } catch (err: any) {
      store.errorMsg = err.message || "An error occurred.";
    }
  });

  // Client-side polling for real-time dashboard updates
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
        <p style={{ color: "var(--text-muted)", marginTop: "0.25rem" }}>
          Manage background scheduled jobs and monitor their execution history in real-time.
        </p>
      </header>

      {store.successMsg && <div class="alert alert-success">{store.successMsg}</div>}
      {store.errorMsg && <div class="alert alert-danger">{store.errorMsg}</div>}

      <div class="grid">
        {/* Left Column: Tasks List and Execution History */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Tasks List Card */}
          <div class="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2>Tasks</h2>
              <button class="btn btn-secondary btn-sm" onClick$={refreshData}>
                Refresh Now
              </button>
            </div>

            <div class="table-wrapper">
              {store.tasks.length === 0 ? (
                <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem 0" }}>
                  No tasks configured. Create one using the form on the right!
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
                    {store.tasks.map((task) => (
                      <tr key={task.id}>
                        <td style={{ fontWeight: "600" }}>{task.id}</td>
                        <td>{task.name}</td>
                        <td style={{ fontFamily: "monospace", backgroundColor: "#f1f5f9", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.8rem" }}>
                          {task.command}
                        </td>
                        <td>{task.interval_seconds}s</td>
                        <td>
                          <span class={`badge ${task.status === "ACTIVE" ? "badge-active" : "badge-paused"}`}>
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
                                class="btn btn-primary btn-sm"
                                onClick$={() => handleResume(task.id)}
                              >
                                Resume
                              </button>
                            )}
                            <button
                              class="btn btn-secondary btn-sm"
                              onClick$={() => handleTrigger(task.id)}
                            >
                              Trigger
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

          {/* Execution History Card */}
          <div class="card">
            <h2>Recent Execution History</h2>
            <div class="table-wrapper">
              {store.history.length === 0 ? (
                <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem 0" }}>
                  No execution logs yet. Active tasks will execute on their intervals, or you can trigger them manually.
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Task ID</th>
                      <th>Status</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {store.history.map((log) => (
                      <tr key={log.id}>
                        <td>{log.id}</td>
                        <td style={{ fontWeight: "600" }}>{log.task_id}</td>
                        <td>
                          <span class={`badge ${log.status === "SUCCESS" ? "badge-success" : "badge-failed"}`}>
                            {log.status}
                          </span>
                        </td>
                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Create Task Form */}
        <div>
          <div class="card">
            <h2>Create New Task</h2>
            <div class="form-group">
              <label for="taskId">Task ID (unique slug/UUID)</label>
              <input
                type="text"
                id="taskId"
                placeholder="e.g. hello-task"
                value={store.formId}
                onInput$={(e, el) => (store.formId = el.value)}
              />
            </div>

            <div class="form-group">
              <label for="taskName">Task Name</label>
              <input
                type="text"
                id="taskName"
                placeholder="e.g. Hello Task"
                value={store.formName}
                onInput$={(e, el) => (store.formName = el.value)}
              />
            </div>

            <div class="form-group">
              <label for="taskCommand">Shell Command</label>
              <input
                type="text"
                id="taskCommand"
                placeholder="e.g. echo 'hello world'"
                value={store.formCommand}
                onInput$={(e, el) => (store.formCommand = el.value)}
              />
            </div>

            <div class="form-group">
              <label for="taskInterval">Interval (seconds)</label>
              <input
                type="number"
                id="taskInterval"
                min="1"
                placeholder="e.g. 5"
                value={store.formInterval}
                onInput$={(e, el) => (store.formInterval = Number(el.value))}
              />
            </div>

            <div class="form-group">
              <label for="taskStatus">Initial Status</label>
              <select
                id="taskStatus"
                value={store.formStatus}
                onChange$={(e, el) => (store.formStatus = el.value as any)}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
              </select>
            </div>

            <button class="btn btn-primary" style={{ width: "100%" }} onClick$={handleCreate}>
              Create Task
            </button>
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
      content: "Scheduled Tasks Manager and Dashboard built with Qwik City and SQLite.",
    },
  ],
};
