import { component$ } from "@builder.io/qwik";
import {
  Form,
  routeAction$,
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import {
  createTask,
  getAllHistory,
  getAllTasks,
  getTaskById,
  updateTaskStatus,
  type Task,
} from "~/lib/db";
import { triggerTaskNow } from "~/lib/scheduler";

export const useTasksLoader = routeLoader$(() => {
  return getAllTasks();
});

export const useHistoryLoader = routeLoader$(() => {
  return getAllHistory(50);
});

export const useCreateTaskAction = routeAction$((data, requestEvent) => {
  const id = String(data.id ?? "").trim();
  const name = String(data.name ?? "").trim();
  const command = String(data.command ?? "").trim();
  const interval_seconds = Number(data.interval_seconds);
  const status = data.status === "PAUSED" ? "PAUSED" : "ACTIVE";

  if (!id || !name || !command || !Number.isFinite(interval_seconds) || interval_seconds <= 0) {
    return requestEvent.fail(400, {
      message: "Please fill in all fields with a valid positive interval.",
    });
  }

  if (getTaskById(id)) {
    return requestEvent.fail(400, {
      message: `A task with id "${id}" already exists.`,
    });
  }

  const task: Task = { id, name, command, interval_seconds, status };
  createTask(task);
  return { success: true };
});

export const usePauseAction = routeAction$((data, requestEvent) => {
  const id = String(data.id ?? "");
  const task = getTaskById(id);
  if (!task) {
    return requestEvent.fail(404, { message: `Task "${id}" not found.` });
  }
  updateTaskStatus(id, "PAUSED");
  return { success: true };
});

export const useResumeAction = routeAction$((data, requestEvent) => {
  const id = String(data.id ?? "");
  const task = getTaskById(id);
  if (!task) {
    return requestEvent.fail(404, { message: `Task "${id}" not found.` });
  }
  updateTaskStatus(id, "ACTIVE");
  return { success: true };
});

export const useTriggerAction = routeAction$((data, requestEvent) => {
  const id = String(data.id ?? "");
  const task = getTaskById(id);
  if (!task) {
    return requestEvent.fail(404, { message: `Task "${id}" not found.` });
  }
  triggerTaskNow(task.id, task.command);
  return { success: true };
});

export default component$(() => {
  const tasks = useTasksLoader();
  const history = useHistoryLoader();

  const createAction = useCreateTaskAction();
  const pauseAction = usePauseAction();
  const resumeAction = useResumeAction();
  const triggerAction = useTriggerAction();

  return (
    <div class="tasks-page">
      <h1>Scheduled Tasks Dashboard</h1>

      <section>
        <h2>Tasks</h2>
        {tasks.value.length === 0 ? (
          <p>No tasks yet. Create one below.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Command</th>
                <th>Interval (s)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.value.map((task) => (
                <tr key={task.id}>
                  <td>{task.id}</td>
                  <td>{task.name}</td>
                  <td>
                    <code>{task.command}</code>
                  </td>
                  <td>{task.interval_seconds}</td>
                  <td>{task.status}</td>
                  <td class="task-actions">
                    {task.status === "ACTIVE" ? (
                      <Form action={pauseAction}>
                        <input type="hidden" name="id" value={task.id} />
                        <button type="submit">Pause</button>
                      </Form>
                    ) : (
                      <Form action={resumeAction}>
                        <input type="hidden" name="id" value={task.id} />
                        <button type="submit">Resume</button>
                      </Form>
                    )}
                    <Form action={triggerAction}>
                      <input type="hidden" name="id" value={task.id} />
                      <button type="submit">Trigger now</button>
                    </Form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Create a new task</h2>
        <Form action={createAction}>
          <div class="form-row">
            <label>
              ID
              <input type="text" name="id" required />
            </label>
            <label>
              Name
              <input type="text" name="name" required />
            </label>
          </div>
          <div class="form-row">
            <label>
              Command
              <input type="text" name="command" required />
            </label>
            <label>
              Interval (seconds)
              <input type="number" name="interval_seconds" min="1" required />
            </label>
            <label>
              Status
              <select name="status">
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
              </select>
            </label>
          </div>
          <button type="submit">Create task</button>
        </Form>
        {createAction.value?.failed && (
          <p class="error">{createAction.value.message}</p>
        )}
      </section>

      <section>
        <h2>Recent execution history</h2>
        {history.value.length === 0 ? (
          <p>No executions logged yet.</p>
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
              {history.value.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.id}</td>
                  <td>{entry.task_id}</td>
                  <td>{entry.status}</td>
                  <td>{entry.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Scheduled Tasks Dashboard",
  meta: [
    {
      name: "description",
      content: "Manage and monitor scheduled background tasks.",
    },
  ],
};
