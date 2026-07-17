import { $, component$, useStore } from "@builder.io/qwik";
import {
  routeAction$,
  routeLoader$,
  z,
  zod$,
  type DocumentHead,
} from "@builder.io/qwik-city";

export const useTodosLoader = routeLoader$(async () => {
  const { listTodos } = await import("~/lib/db");
  return listTodos();
});

export const useAddTodoAction = routeAction$(
  async (data, requestEvent) => {
    const { insertTodo, shouldSimulateFailure, simulateLatency } =
      await import("~/lib/db");

    if (shouldSimulateFailure(data.title)) {
      return requestEvent.fail(400, {
        message: `Failed to save "${data.title}": titles starting with "FAIL" are rejected by the server.`,
      });
    }

    await simulateLatency(data.title);

    const todo = insertTodo(data.id, data.title);
    return { success: true as const, todo };
  },
  zod$({
    id: z.string().min(1),
    title: z.string().min(1),
  }),
);

export const useToggleTodoAction = routeAction$(
  async (data, requestEvent) => {
    const { setTodoCompleted, shouldSimulateFailure, simulateLatency } =
      await import("~/lib/db");

    if (shouldSimulateFailure(data.title)) {
      return requestEvent.fail(400, {
        message: `Failed to update "${data.title}": titles starting with "FAIL" are rejected by the server.`,
      });
    }

    await simulateLatency(data.title);

    const todo = setTodoCompleted(data.id, data.completed);
    if (!todo) {
      return requestEvent.fail(404, {
        message: `Todo "${data.title}" was not found.`,
      });
    }
    return { success: true as const, todo };
  },
  zod$({
    id: z.string().min(1),
    title: z.string().min(1),
    completed: z.boolean(),
  }),
);

export const useDeleteTodoAction = routeAction$(
  async (data, requestEvent) => {
    const { deleteTodo, shouldSimulateFailure, simulateLatency } =
      await import("~/lib/db");

    if (shouldSimulateFailure(data.title)) {
      return requestEvent.fail(400, {
        message: `Failed to delete "${data.title}": titles starting with "FAIL" are rejected by the server.`,
      });
    }

    await simulateLatency(data.title);

    deleteTodo(data.id);
    return { success: true as const, id: data.id };
  },
  zod$({
    id: z.string().min(1),
    title: z.string().min(1),
  }),
);

interface OptimisticTodo {
  id: string;
  title: string;
  completed: boolean;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default component$(() => {
  const todosLoader = useTodosLoader();
  const addTodoAction = useAddTodoAction();
  const toggleTodoAction = useToggleTodoAction();
  const deleteTodoAction = useDeleteTodoAction();

  const store = useStore<{
    todos: OptimisticTodo[];
    pending: Record<string, boolean>;
    error: string | null;
    newTitle: string;
  }>({
    todos: todosLoader.value.map((t) => ({ ...t })),
    pending: {},
    error: null,
    newTitle: "",
  });

  const addTodo = $(async () => {
    const title = store.newTitle.trim();
    if (!title) return;

    const id = createId();
    store.error = null;
    store.newTitle = "";

    // Optimistic insert.
    store.todos.push({ id, title, completed: false });
    store.pending[id] = true;

    const result = await addTodoAction.submit({ id, title });

    store.pending[id] = false;

    if (result.value.failed) {
      // Roll back the optimistic insert.
      store.todos = store.todos.filter((t) => t.id !== id);
      store.error =
        (result.value as { message?: string }).message ??
        "Failed to add todo.";
      return;
    }

    // Reconcile with server truth.
    const persisted = (
      result.value as {
        success: true;
        todo: { id: string; title: string; completed: boolean };
      }
    ).todo;
    const idx = store.todos.findIndex((t) => t.id === id);
    if (idx !== -1) {
      store.todos[idx] = { ...persisted };
    }
  });

  const toggleTodo = $(async (id: string) => {
    const todo = store.todos.find((t) => t.id === id);
    if (!todo) return;

    const previousCompleted = todo.completed;
    const nextCompleted = !previousCompleted;

    store.error = null;
    // Optimistic update.
    todo.completed = nextCompleted;
    store.pending[id] = true;

    const result = await toggleTodoAction.submit({
      id,
      title: todo.title,
      completed: nextCompleted,
    });

    store.pending[id] = false;

    if (result.value.failed) {
      // Roll back.
      const rollbackTodo = store.todos.find((t) => t.id === id);
      if (rollbackTodo) {
        rollbackTodo.completed = previousCompleted;
      }
      store.error =
        (result.value as { message?: string }).message ??
        "Failed to update todo.";
      return;
    }

    const persisted = (
      result.value as {
        success: true;
        todo: { id: string; title: string; completed: boolean };
      }
    ).todo;
    const idx = store.todos.findIndex((t) => t.id === id);
    if (idx !== -1) {
      store.todos[idx] = { ...persisted };
    }
  });

  const deleteTodoHandler = $(async (id: string) => {
    const todo = store.todos.find((t) => t.id === id);
    if (!todo) return;

    const index = store.todos.findIndex((t) => t.id === id);
    const removed = { ...todo };

    store.error = null;
    // Optimistic removal.
    store.todos = store.todos.filter((t) => t.id !== id);
    store.pending[id] = true;

    const result = await deleteTodoAction.submit({ id, title: removed.title });

    store.pending[id] = false;

    if (result.value.failed) {
      // Roll back: re-insert at original position.
      const restored = [...store.todos];
      restored.splice(index, 0, removed);
      store.todos = restored;
      store.error =
        (result.value as { message?: string }).message ??
        "Failed to delete todo.";
    }
  });

  return (
    <>
      <h1>Todos</h1>

      <div>
        <input
          data-testid="new-todo-input"
          type="text"
          value={store.newTitle}
          placeholder="What needs to be done?"
          onInput$={(_, el) => {
            store.newTitle = el.value;
          }}
          onKeyDown$={(ev) => {
            if (ev.key === "Enter") {
              addTodo();
            }
          }}
        />
        <button data-testid="add-todo" type="button" onClick$={addTodo}>
          Add
        </button>
      </div>

      {store.error && (
        <div data-testid="error-message" role="alert">
          {store.error}
        </div>
      )}

      <ul data-testid="todo-list">
        {store.todos.map((todo) => (
          <li
            key={todo.id}
            data-testid="todo-item"
            data-title={todo.title}
            data-pending={store.pending[todo.id] ? "true" : "false"}
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange$={() => toggleTodo(todo.id)}
            />
            <span
              style={{
                textDecoration: todo.completed ? "line-through" : "none",
              }}
            >
              {todo.title}
            </span>
            <button
              data-testid="delete-todo"
              type="button"
              onClick$={() => deleteTodoHandler(todo.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </>
  );
});

export const head: DocumentHead = {
  title: "Optimistic Todos",
  meta: [
    {
      name: "description",
      content: "Optimistic-UI todo app with server reconciliation",
    },
  ],
};
