import {
  $,
  component$,
  useSignal,
  useStore,
  useTask$,
  type QRL,
} from "@builder.io/qwik";
import {
  routeAction$,
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import {
  deleteTodo,
  insertTodo,
  listTodos,
  updateTodo,
  type Todo,
} from "~/lib/db.server";

interface TodoActionOkAdd {
  ok: true;
  op: "add";
  todo: Todo;
}
interface TodoActionOkUpdate {
  ok: true;
  op: "update";
  todo: Todo;
}
interface TodoActionOkDelete {
  ok: true;
  op: "delete";
  id: string;
}
interface TodoActionFail {
  ok: false;
  op: "add" | "update" | "delete";
  message: string;
}

type TodoActionResult =
  | TodoActionOkAdd
  | TodoActionOkUpdate
  | TodoActionOkDelete
  | TodoActionFail;

export const useTodosLoader = routeLoader$(async () => {
  return { todos: listTodos() };
});

export const useTodoAction = routeAction$(async (data, event) => {
  const op = String((data as Record<string, unknown>).op ?? "");
  const title = String((data as Record<string, unknown>).title ?? "").trim();

  if (op === "add") {
    if (!title) {
      return event.fail(400, {
        ok: false as const,
        op: "add" as const,
        message: "Title is required",
      });
    }
    if (title.toUpperCase().startsWith("FAIL")) {
      return event.fail(400, {
        ok: false as const,
        op: "add" as const,
        message:
          "Server refused to persist this todo (titles beginning with FAIL are rejected)",
      });
    }
    if (title.toUpperCase().startsWith("SLOW")) {
      await new Promise<void>((resolve) => setTimeout(resolve, 1100));
    }
    const clientId = String((data as Record<string, unknown>).id ?? "");
    const todo: Todo = {
      id: clientId,
      title,
      completed: false,
    };
    insertTodo(todo);
    return { ok: true as const, op: "add" as const, todo };
  }

  if (op === "update") {
    const id = String((data as Record<string, unknown>).id ?? "");
    if (!id) {
      return event.fail(400, {
        ok: false as const,
        op: "update" as const,
        message: "id is required",
      });
    }
    const rawCompleted = (data as Record<string, unknown>).completed;
    const completed = rawCompleted === true || rawCompleted === "true" || rawCompleted === 1;
    const updated = updateTodo(id, { completed });
    if (!updated) {
      return event.fail(404, {
        ok: false as const,
        op: "update" as const,
        message: "todo not found",
      });
    }
    return { ok: true as const, op: "update" as const, todo: updated };
  }

  if (op === "delete") {
    const id = String((data as Record<string, unknown>).id ?? "");
    if (!id) {
      return event.fail(400, {
        ok: false as const,
        op: "delete" as const,
        message: "id is required",
      });
    }
    deleteTodo(id);
    return { ok: true as const, op: "delete" as const, id };
  }

  return event.fail(400, {
    ok: false as const,
    op: "add" as const,
    message: "Unknown operation",
  });
});

interface TodoStore {
  todos: Todo[];
  pending: Record<string, boolean>;
}

function isFail(value: unknown): value is TodoActionFail {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { ok?: unknown }).ok === false
  );
}

export default component$(() => {
  const initial = useTodosLoader();
  const action = useTodoAction();

  const store = useStore<TodoStore>(
    {
      todos: initial.value.todos.map((t) => ({ ...t })),
      pending: {},
    },
    { deep: true },
  );

  const errorMessage = useSignal<string>("");
  const newTitle = useSignal<string>("");

  // Keep the local store in sync if the loader value changes (e.g. after a
  // server-side revalidation). We only adopt the loader's snapshot when no
  // optimistic mutations are in flight.
  useTask$(({ track }) => {
    const next = track(() => initial.value.todos);
    const hasPending = Object.values(store.pending).some(Boolean);
    if (hasPending) return;
    store.todos = next.map((t) => ({ ...t }));
  });

  const handleAdd: QRL<() => Promise<void>> = $(async () => {
    const title = newTitle.value.trim();
    if (!title) return;
    const clientId = `client-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    const optimistic: Todo = { id: clientId, title, completed: false };
    store.todos = [...store.todos, optimistic];
    store.pending[clientId] = true;
    newTitle.value = "";
    errorMessage.value = "";

    try {
      const result = await action.submit({
        op: "add",
        id: clientId,
        title,
      });
      const v = result.value as unknown;
      if (isFail(v)) {
        // Rollback optimistic insert.
        store.todos = store.todos.filter((t) => t.id !== clientId);
        errorMessage.value = v.message || "Failed to add todo";
      } else if (v && (v as TodoActionOkAdd).todo) {
        const serverTodo = (v as TodoActionOkAdd).todo;
        // Reconcile: replace optimistic entry with server-truth entry.
        store.todos = store.todos.map((t) =>
          t.id === clientId ? { ...serverTodo } : t,
        );
      }
    } catch (err) {
      store.todos = store.todos.filter((t) => t.id !== clientId);
      errorMessage.value =
        err instanceof Error ? err.message : "Failed to add todo";
    } finally {
      store.pending[clientId] = false;
    }
  });

  const handleToggle: QRL<(todo: Todo) => Promise<void>> = $(async (todo) => {
    const previousCompleted = todo.completed;
    const nextCompleted = !todo.completed;
    // Optimistic toggle.
    store.todos = store.todos.map((t) =>
      t.id === todo.id ? { ...t, completed: nextCompleted } : t,
    );
    store.pending[todo.id] = true;
    errorMessage.value = "";

    try {
      const result = await action.submit({
        op: "update",
        id: todo.id,
        completed: nextCompleted,
      });
      const v = result.value as unknown;
      if (isFail(v)) {
        // Rollback optimistic toggle.
        store.todos = store.todos.map((t) =>
          t.id === todo.id ? { ...t, completed: previousCompleted } : t,
        );
        errorMessage.value = v.message || "Failed to update todo";
      } else if (v && (v as TodoActionOkUpdate).todo) {
        const serverTodo = (v as TodoActionOkUpdate).todo;
        store.todos = store.todos.map((t) =>
          t.id === todo.id ? { ...serverTodo } : t,
        );
      }
    } catch (err) {
      store.todos = store.todos.map((t) =>
        t.id === todo.id ? { ...t, completed: previousCompleted } : t,
      );
      errorMessage.value =
        err instanceof Error ? err.message : "Failed to update todo";
    } finally {
      store.pending[todo.id] = false;
    }
  });

  const handleDelete: QRL<(todo: Todo) => Promise<void>> = $(async (todo) => {
    const removed = { ...todo };
    // Optimistic delete.
    store.todos = store.todos.filter((t) => t.id !== todo.id);
    store.pending[todo.id] = true;
    errorMessage.value = "";

    try {
      const result = await action.submit({
        op: "delete",
        id: todo.id,
      });
      const v = result.value as unknown;
      if (isFail(v)) {
        // Rollback optimistic delete by re-inserting at the original position.
        const insertAt = store.todos.findIndex((t) => t.id === removed.id);
        if (insertAt === -1) {
          store.todos = [...store.todos, removed];
        } else {
          store.todos = [
            ...store.todos.slice(0, insertAt),
            removed,
            ...store.todos.slice(insertAt),
          ];
        }
        errorMessage.value = v.message || "Failed to delete todo";
      }
    } catch (err) {
      // Rollback optimistic delete.
      const insertAt = store.todos.findIndex((t) => t.id === removed.id);
      if (insertAt === -1) {
        store.todos = [...store.todos, removed];
      } else {
        store.todos = [
          ...store.todos.slice(0, insertAt),
          removed,
          ...store.todos.slice(insertAt),
        ];
      }
      errorMessage.value =
        err instanceof Error ? err.message : "Failed to delete todo";
    } finally {
      store.pending[todo.id] = false;
    }
  });

  return (
    <main class="todo-app">
      <h1>Optimistic Todos</h1>
      <p>
        Add a todo. Titles starting with <code>FAIL</code> are rejected by the
        server; titles starting with <code>SLOW</code> take ~1.1s to persist so
        the pending state is observable.
      </p>

      {errorMessage.value ? (
        <div
          data-testid="error-message"
          role="alert"
          style="color: #b00020; margin: 0.5rem 0;"
        >
          {errorMessage.value}
        </div>
      ) : null}

      <div style="display: flex; gap: 0.5rem; margin: 0.5rem 0;">
        <input
          data-testid="new-todo-input"
          type="text"
          placeholder="What needs to be done?"
          value={newTitle.value}
          onInput$={(_, el) => {
            newTitle.value = el.value;
          }}
          onKeyDown$={(ev) => {
            if (ev.key === "Enter") {
              // Fire and forget; the action is async-safe.
              void handleAdd();
            }
          }}
          style="flex: 1;"
        />
        <button
          data-testid="add-todo"
          type="button"
          onClick$={() => {
            void handleAdd();
          }}
        >
          Add
        </button>
      </div>

      <ul data-testid="todo-list" style="list-style: none; padding: 0;">
        {store.todos.map((todo) => {
          const isPending = !!store.pending[todo.id];
          return (
            <li
              key={todo.id}
              data-testid="todo-item"
              data-title={todo.title}
              data-pending={isPending ? "true" : "false"}
              style="display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; opacity: 1;"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                aria-label={`Toggle ${todo.title}`}
                onChange$={() => {
                  void handleToggle(todo);
                }}
              />
              <span
                style={
                  todo.completed
                    ? "text-decoration: line-through; opacity: 0.6;"
                    : ""
                }
              >
                {todo.title}
                {isPending ? " (saving…)" : ""}
              </span>
              <button
                data-testid="delete-todo"
                type="button"
                onClick$={() => {
                  void handleDelete(todo);
                }}
                style="margin-left: auto;"
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Optimistic Todos",
  meta: [
    {
      name: "description",
      content: "A Qwik City todo app demonstrating optimistic UI updates.",
    },
  ],
};