import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import "./index.css";

interface Task {
  id: string;
  name: string;
  command: string;
  interval_seconds: number;
  status: "ACTIVE" | "PAUSED";
}

interface ExecutionHistory {
  id: number;
  task_id: string;
  status: "SUCCESS" | "FAILED";
  timestamp: string;
}

export default component$(() => {
  const tasks = useSignal<Task[]>([]);
  const history = useSignal<ExecutionHistory[]>([]);
  const loading = useSignal(true);
  const error = useSignal("");

  // Form fields
  const formId = useSignal("");
  const formName = useSignal("");
  const formCommand = useSignal("");
  const formInterval = useSignal(5);
  const formStatus = useSignal<"ACTIVE" | "PAUSED">("ACTIVE");
  const formError = useSignal("");
  const formSuccess = useSignal("");

  const fetchData = $(async () => {
    loading.value = true;
    error.value = "";
    try {
      const [tasksRes, historyRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/tasks/all-history"),
      ]);

      if (tasksRes.ok) {
        tasks.value = await tasksRes.json();
      }
      if (historyRes.ok) {
        history.value = await historyRes.json();
      }
    } catch (e) {
      error.value = "Failed to fetch data";
    } finally {
      loading.value = false;
    }
  });

  useVisibleTask$(() => {
    fetchData();
  });

  const handleCreate = $(async () => {
    formError.value = "";
    formSuccess.value = "";

    if (!formId.value.trim()) {
      formError.value = "ID is required";
      return;
    }
    if (!formName.value.trim()) {
      formError.value = "Name is required";
      return;
    }
    if (!formCommand.value.trim()) {
      formError.value = "Command is required";
      return;
    }
    if (formInterval.value <= 0 || !Number.isInteger(formInterval.value)) {
      formError.value = "Interval must be a positive integer";
      return;
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formId.value.trim(),
          name: formName.value.trim(),
          command: formCommand.value.trim(),
          interval_seconds: formInterval.value,
          status: formStatus.value,
        }),
      });

      if (res.ok) {
        formSuccess.value = "Task created successfully!";
        formId.value = "";
        formName.value = "";
        formCommand.value = "";
        formInterval.value = 5;
        formStatus.value = "ACTIVE";
        fetchData();
      } else {
        const err = await res.json();
        formError.value = err.error || "Failed to create task";
      }
    } catch (e) {
      formError.value = "Network error";
    }
  });

  const handlePause = $(async (id: string) => {
    await fetch(`/api/tasks/${id}/pause`, { method: "POST" });
    fetchData();
  });

  const handleResume = $(async (id: string) => {
    await fetch(`/api/tasks/${id}/resume`, { method: "POST" });
    fetchData();
  });

  const handleTrigger = $(async (id: string) => {
    await fetch(`/api/tasks/${id}/trigger`, { method: "POST" });
    // Refresh history after a brief delay to allow execution to complete
    setTimeout(() => fetchData(), 500);
  });

  return (
    <div class="container">
      <h1>Scheduled Tasks Dashboard</h1>

      {loading.value && <p>Loading...</p>}
      {error.value && <p class="error">{error.value}</p>}

      <section class="section">
        <h2>Create New Task</h2>
        <form
          preventdefault:submit
          onSubmit$={handleCreate}
          class="task-form"
        >
          <div class="form-group">
            <label for="formId">ID</label>
            <input
              id="formId"
              type="text"
              bind:value={formId}
              placeholder="e.g. hello-world"
            />
          </div>
          <div class="form-group">
            <label for="formName">Name</label>
            <input
              id="formName"
              type="text"
              bind:value={formName}
              placeholder="e.g. Hello World"
            />
          </div>
          <div class="form-group">
            <label for="formCommand">Command</label>
            <input
              id="formCommand"
              type="text"
              bind:value={formCommand}
              placeholder="e.g. echo 'hello'"
            />
          </div>
          <div class="form-group">
            <label for="formInterval">Interval (seconds)</label>
            <input
              id="formInterval"
              type="number"
              bind:value={formInterval}
              min="1"
            />
          </div>
          <div class="form-group">
            <label for="formStatus">Status</label>
            <select id="formStatus" bind:value={formStatus}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary">
            Create Task
          </button>
          {formError.value && <p class="error">{formError.value}</p>}
          {formSuccess.value && <p class="success">{formSuccess.value}</p>}
        </form>
      </section>

      <section class="section">
        <h2>Tasks</h2>
        {tasks.value.length === 0 && !loading.value && (
          <p>No tasks yet. Create one above.</p>
        )}
        <div class="task-list">
          {tasks.value.map((task) => (
            <div key={task.id} class="task-card">
              <div class="task-info">
                <strong>{task.name}</strong>
                <span class="task-id">{task.id}</span>
                <span class="task-command">
                  <code>{task.command}</code>
                </span>
                <span>Interval: {task.interval_seconds}s</span>
                <span
                  class={`status-badge ${task.status === "ACTIVE" ? "status-active" : "status-paused"}`}
                >
                  {task.status}
                </span>
              </div>
              <div class="task-actions">
                {task.status === "ACTIVE" ? (
                  <button
                    class="btn btn-warning"
                    onClick$={() => handlePause(task.id)}
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    class="btn btn-success"
                    onClick$={() => handleResume(task.id)}
                  >
                    Resume
                  </button>
                )}
                <button
                  class="btn btn-secondary"
                  onClick$={() => handleTrigger(task.id)}
                >
                  Trigger
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section class="section">
        <h2>Execution History</h2>
        {history.value.length === 0 && !loading.value && (
          <p>No execution history yet.</p>
        )}
        <table class="history-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Task ID</th>
              <th>Status</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {history.value.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.id}</td>
                <td>{entry.task_id}</td>
                <td>
                  <span
                    class={`status-badge ${entry.status === "SUCCESS" ? "status-active" : "status-paused"}`}
                  >
                    {entry.status}
                  </span>
                </td>
                <td>{entry.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Scheduled Tasks Dashboard",
};
