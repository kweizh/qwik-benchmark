import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { db } from "~/lib/db";

export const useTasksData = routeLoader$(async () => {
  try {
    const tasks = db.prepare("SELECT * FROM tasks").all() as any[];
    const history = db
      .prepare("SELECT * FROM execution_history ORDER BY timestamp DESC LIMIT 50")
      .all() as any[];
    return { tasks, history };
  } catch (err) {
    console.error("Loader error:", err);
    return { tasks: [], history: [] };
  }
});

export default component$(() => {
  const initialData = useTasksData();
  const tasks = useSignal(initialData.value.tasks);
  const history = useSignal(initialData.value.history);

  // Form signals
  const formId = useSignal("");
  const formName = useSignal("");
  const formCommand = useSignal("");
  const formInterval = useSignal(5);
  const formStatus = useSignal<"ACTIVE" | "PAUSED">("ACTIVE");
  const formError = useSignal<string | null>(null);
  const formSuccess = useSignal<string | null>(null);

  // Refresh helper
  const refreshData = $(async () => {
    try {
      const tasksRes = await fetch("/api/tasks");
      if (tasksRes.ok) {
        tasks.value = await tasksRes.json();
      }
      const historyRes = await fetch("/api/tasks/all-history");
      if (historyRes.ok) {
        history.value = await historyRes.json();
      }
    } catch (err) {
      console.error("Failed to refresh data:", err);
    }
  });

  // Polling in background
  useVisibleTask$(({ cleanup }) => {
    const interval = setInterval(() => {
      refreshData();
    }, 2000);
    cleanup(() => clearInterval(interval));
  });

  // Form submit handler
  const handleCreateTask = $(async () => {
    formError.value = null;
    formSuccess.value = null;

    const id = formId.value.trim();
    const name = formName.value.trim();
    const command = formCommand.value.trim();
    const interval_seconds = Number(formInterval.value);
    const status = formStatus.value;

    if (!id) {
      formError.value = "Task ID is required";
      return;
    }
    if (!name) {
      formError.value = "Task Name is required";
      return;
    }
    if (!command) {
      formError.value = "Command is required";
      return;
    }
    if (isNaN(interval_seconds) || interval_seconds <= 0) {
      formError.value = "Interval must be a positive integer";
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

      const data = await res.json();
      if (!res.ok) {
        formError.value = data.error || "Failed to create task";
      } else {
        formSuccess.value = `Task "${data.name}" created successfully!`;
        // Reset form
        formId.value = "";
        formName.value = "";
        formCommand.value = "";
        formInterval.value = 5;
        formStatus.value = "ACTIVE";
        // Refresh immediately
        await refreshData();
      }
    } catch (err: any) {
      formError.value = err.message || "An unexpected error occurred";
    }
  });

  // Action handlers
  const handlePause = $(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/pause`, { method: "POST" });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error("Failed to pause task:", err);
    }
  });

  const handleResume = $(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/resume`, { method: "POST" });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error("Failed to resume task:", err);
    }
  });

  const handleTrigger = $(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/trigger`, { method: "POST" });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error("Failed to trigger task:", err);
    }
  });

  return (
    <div class="min-h-screen bg-gray-900 text-gray-100 font-sans pb-12">
      {/* Header */}
      <header class="bg-gray-800 border-b border-gray-700 py-6 px-8 shadow-md">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Scheduled Tasks Dashboard
            </h1>
            <p class="text-gray-400 mt-1 text-sm">
              Manage, trigger, and monitor background shell commands in real-time.
            </p>
          </div>
          <div class="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-lg border border-gray-700">
            <span class="relative flex h-3 width-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span class="text-sm font-medium text-gray-300">Runner Active</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Create Task Form */}
        <div class="lg:col-span-1">
          <div class="bg-gray-800 rounded-xl border border-gray-700 shadow-lg p-6">
            <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <svg
                class="w-5 h-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              Create New Task
            </h2>

            {formError.value && (
              <div class="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg text-sm">
                {formError.value}
              </div>
            )}

            {formSuccess.value && (
              <div class="mb-4 p-3 bg-green-900/50 border border-green-700 text-green-200 rounded-lg text-sm">
                {formSuccess.value}
              </div>
            )}

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Task ID (slug)
                </label>
                <input
                  type="text"
                  placeholder="e.g. backup-db"
                  bind:value={formId}
                  class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Task Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Database Backup"
                  bind:value={formName}
                  class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Shell Command
                </label>
                <input
                  type="text"
                  placeholder="e.g. echo 'Backup complete'"
                  bind:value={formCommand}
                  class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Interval (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  bind:value={formInterval}
                  class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Initial Status
                </label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="ACTIVE"
                      checked={formStatus.value === "ACTIVE"}
                      onChange$={() => (formStatus.value = "ACTIVE")}
                      class="text-blue-500 focus:ring-blue-500 bg-gray-900 border-gray-700"
                    />
                    <span class="text-sm">Active</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="PAUSED"
                      checked={formStatus.value === "PAUSED"}
                      onChange$={() => (formStatus.value = "PAUSED")}
                      class="text-blue-500 focus:ring-blue-500 bg-gray-900 border-gray-700"
                    />
                    <span class="text-sm">Paused</span>
                  </label>
                </div>
              </div>

              <button
                onClick$={handleCreateTask}
                class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors mt-6 shadow-md shadow-blue-900/20"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Configured Tasks */}
        <div class="lg:col-span-2 space-y-8">
          <div class="bg-gray-800 rounded-xl border border-gray-700 shadow-lg p-6">
            <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <svg
                class="w-5 h-5 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                ></path>
              </svg>
              Configured Tasks
            </h2>

            {tasks.value.length === 0 ? (
              <div class="text-center py-12 text-gray-500">
                <svg
                  class="w-12 h-12 mx-auto mb-3 opacity-30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  ></path>
                </svg>
                No tasks configured yet. Create one on the left!
              </div>
            ) : (
              <div class="space-y-4">
                {tasks.value.map((task: any) => (
                  <div
                    key={task.id}
                    class="bg-gray-900 rounded-lg p-5 border border-gray-700/50 hover:border-gray-700 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div class="space-y-2 flex-1 min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="text-lg font-bold text-white truncate">
                          {task.name}
                        </h3>
                        <span class="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700 font-mono">
                          {task.id}
                        </span>
                        <span class="text-xs bg-indigo-900/30 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/30">
                          {task.interval_seconds}s interval
                        </span>
                        {task.status === "ACTIVE" ? (
                          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-900/30 text-green-300 border border-green-700/30">
                            <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                            Active
                          </span>
                        ) : (
                          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-400 border border-gray-700">
                            <span class="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                            Paused
                          </span>
                        )}
                      </div>
                      <div class="bg-gray-950 rounded p-2.5 border border-gray-800 font-mono text-xs text-blue-300 overflow-x-auto whitespace-pre">
                        {task.command}
                      </div>
                    </div>

                    <div class="flex gap-2 self-stretch md:self-auto justify-end">
                      {task.status === "ACTIVE" ? (
                        <button
                          onClick$={() => handlePause(task.id)}
                          class="flex-1 md:flex-initial bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 border border-yellow-700/50 font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors"
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick$={() => handleResume(task.id)}
                          class="flex-1 md:flex-initial bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-700/50 font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors"
                        >
                          Resume
                        </button>
                      )}
                      <button
                        onClick$={() => handleTrigger(task.id)}
                        class="flex-1 md:flex-initial bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-700/50 font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors"
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
      </main>

      {/* Full Width: Recent Execution History */}
      <section class="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        <div class="bg-gray-800 rounded-xl border border-gray-700 shadow-lg p-6">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <svg
              class="w-5 h-5 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            Recent Execution History
          </h2>

          {history.value.length === 0 ? (
            <div class="text-center py-12 text-gray-500">
              <svg
                class="w-12 h-12 mx-auto mb-3 opacity-30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
              No execution history logs yet. Active tasks will log results here.
            </div>
          ) : (
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-gray-700 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th class="py-3 px-4">Timestamp</th>
                    <th class="py-3 px-4">Task ID</th>
                    <th class="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-800 text-sm">
                  {history.value.map((log: any) => (
                    <tr
                      key={log.id}
                      class="hover:bg-gray-700/20 transition-colors"
                    >
                      <td class="py-3 px-4 text-gray-300 font-mono text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td class="py-3 px-4 font-semibold text-white">
                        {log.task_id}
                      </td>
                      <td class="py-3 px-4">
                        {log.status === "SUCCESS" ? (
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-900/30 text-green-300 border border-green-700/30">
                            ✓ Success
                          </span>
                        ) : (
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-900/30 text-red-300 border border-red-700/30">
                            ✗ Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Scheduled Tasks Dashboard",
  links: [
    {
      rel: "stylesheet",
      href: "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
    },
  ],
};
