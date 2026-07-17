import { component$, useStore, $ } from "@builder.io/qwik";
import { routeLoader$, routeAction$ } from "@builder.io/qwik-city";
import { getTodos, getTodoById, addTodo, updateTodo, deleteTodo } from "../db.server";
import type { DocumentHead } from "@builder.io/qwik-city";

// Route loader to fetch initial todos from SQLite database
export const useTodosLoader = routeLoader$(async () => {
  return getTodos();
});

// Route action to add a todo
export const useAddTodo = routeAction$(async (data, { fail }) => {
  const { id, title, completed } = data as { id: string; title: string; completed: number };
  if (!id || typeof id !== "string") {
    return fail(400, { message: "ID is required" });
  }
  if (!title || typeof title !== "string" || title.trim() === "") {
    return fail(400, { message: "Title is required" });
  }
  if (title.startsWith("FAIL")) {
    return fail(400, { message: "Simulated failure: FAIL prefix" });
  }
  if (title.startsWith("SLOW")) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  try {
    addTodo(id, title, completed);
    return { success: true };
  } catch (err: any) {
    return fail(500, { message: err.message || "Database error" });
  }
});

// Route action to toggle a todo
export const useToggleTodo = routeAction$(async (data, { fail }) => {
  const { id, completed } = data as { id: string; completed: number };
  if (!id || typeof id !== "string") {
    return fail(400, { message: "ID is required" });
  }
  const todo = getTodoById(id);
  if (todo) {
    if (todo.title.startsWith("FAIL")) {
      return fail(400, { message: "Simulated failure: FAIL prefix" });
    }
    if (todo.title.startsWith("SLOW")) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  try {
    updateTodo(id, completed);
    return { success: true };
  } catch (err: any) {
    return fail(500, { message: err.message || "Database error" });
  }
});

// Route action to delete a todo
export const useDeleteTodo = routeAction$(async (data, { fail }) => {
  const { id } = data as { id: string };
  if (!id || typeof id !== "string") {
    return fail(400, { message: "ID is required" });
  }
  const todo = getTodoById(id);
  if (todo) {
    if (todo.title.startsWith("FAIL")) {
      return fail(400, { message: "Simulated failure: FAIL prefix" });
    }
    if (todo.title.startsWith("SLOW")) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  try {
    deleteTodo(id);
    return { success: true };
  } catch (err: any) {
    return fail(500, { message: err.message || "Database error" });
  }
});

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
}

export default component$(() => {
  const initialTodos = useTodosLoader();
  const addTodoAction = useAddTodo();
  const toggleTodoAction = useToggleTodo();
  const deleteTodoAction = useDeleteTodo();

  // Client-side reactive store
  const store = useStore<{
    todos: TodoItem[];
    pending: Record<string, boolean>;
    errorMessage: string | null;
    inputValue: string;
  }>({
    todos: initialTodos.value.map((t) => ({
      id: t.id,
      title: t.title,
      completed: t.completed === 1,
    })),
    pending: {},
    errorMessage: null,
    inputValue: "",
  });

  // Helper to generate a unique ID on the client
  const generateId = $(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  });

  // Add todo handler
  const handleAdd = $(async () => {
    const title = store.inputValue.trim();
    if (!title) return;

    const id = await generateId();
    const newTodo: TodoItem = { id, title, completed: false };

    // Optimistic update
    store.todos.push(newTodo);
    store.pending[id] = true;
    store.errorMessage = null;
    store.inputValue = ""; // Clear input immediately for responsiveness

    try {
      const res = await addTodoAction.submit({ id, title, completed: 0 });
      if (res.status !== 200 || !res.value || "message" in res.value) {
        // Rollback
        store.todos = store.todos.filter((t) => t.id !== id);
        const errorMsg = (res.value as any)?.message || "Failed to add todo";
        store.errorMessage = errorMsg;
      }
    } catch (err: any) {
      // Rollback on network or unexpected error
      store.todos = store.todos.filter((t) => t.id !== id);
      store.errorMessage = err.message || "An unexpected error occurred";
    } finally {
      store.pending[id] = false;
    }
  });

  // Toggle todo handler
  const handleToggle = $(async (id: string) => {
    const todoIndex = store.todos.findIndex((t) => t.id === id);
    if (todoIndex === -1) return;

    const todo = store.todos[todoIndex];
    const originalCompleted = todo.completed;
    const newCompleted = !originalCompleted;

    // Optimistic update
    todo.completed = newCompleted;
    store.pending[id] = true;
    store.errorMessage = null;

    try {
      const res = await toggleTodoAction.submit({ id, completed: newCompleted ? 1 : 0 });
      if (res.status !== 200 || !res.value || "message" in res.value) {
        // Rollback
        todo.completed = originalCompleted;
        const errorMsg = (res.value as any)?.message || "Failed to update todo";
        store.errorMessage = errorMsg;
      }
    } catch (err: any) {
      // Rollback on network or unexpected error
      todo.completed = originalCompleted;
      store.errorMessage = err.message || "An unexpected error occurred";
    } finally {
      store.pending[id] = false;
    }
  });

  // Delete todo handler
  const handleDelete = $(async (id: string) => {
    const todoIndex = store.todos.findIndex((t) => t.id === id);
    if (todoIndex === -1) return;

    const originalTodo = store.todos[todoIndex];
    const originalIndex = todoIndex;

    // Optimistic update
    store.todos.splice(todoIndex, 1);
    store.pending[id] = true;
    store.errorMessage = null;

    try {
      const res = await deleteTodoAction.submit({ id });
      if (res.status !== 200 || !res.value || "message" in res.value) {
        // Rollback
        store.todos.splice(originalIndex, 0, originalTodo);
        const errorMsg = (res.value as any)?.message || "Failed to delete todo";
        store.errorMessage = errorMsg;
      }
    } catch (err: any) {
      // Rollback on network or unexpected error
      store.todos.splice(originalIndex, 0, originalTodo);
      store.errorMessage = err.message || "An unexpected error occurred";
    } finally {
      store.pending[id] = false;
    }
  });

  return (
    <div style={{ maxWidth: "500px", margin: "2rem auto", padding: "1rem", fontFamily: "sans-serif" }}>
      <h1>Todo App</h1>

      {store.errorMessage && (
        <div
          data-testid="error-message"
          style={{
            padding: "0.75rem",
            marginBottom: "1rem",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            borderRadius: "0.25rem",
            border: "1px solid #fca5a5",
          }}
        >
          {store.errorMessage}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <input
          type="text"
          data-testid="new-todo-input"
          value={store.inputValue}
          onInput$={(e) => {
            store.inputValue = (e.target as HTMLInputElement).value;
          }}
          onKeyDown$={(e) => {
            if (e.key === "Enter") {
              handleAdd();
            }
          }}
          placeholder="What needs to be done?"
          style={{ flex: 1, padding: "0.5rem", fontSize: "1rem" }}
        />
        <button
          data-testid="add-todo"
          onClick$={handleAdd}
          style={{ padding: "0.5rem 1rem", fontSize: "1rem", cursor: "pointer" }}
        >
          Add
        </button>
      </div>

      <ul data-testid="todo-list" style={{ listStyle: "none", padding: 0 }}>
        {store.todos.map((todo) => {
          const isPending = !!store.pending[todo.id];
          return (
            <li
              key={todo.id}
              data-testid="todo-item"
              data-title={todo.title}
              data-pending={isPending ? "true" : "false"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 0.5rem",
                borderBottom: "1px solid #e5e7eb",
                opacity: isPending ? 0.6 : 1,
                transition: "opacity 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange$={() => handleToggle(todo.id)}
                  style={{ cursor: "pointer", width: "1.2rem", height: "1.2rem" }}
                />
                <span
                  style={{
                    textDecoration: todo.completed ? "line-through" : "none",
                    color: todo.completed ? "#9ca3af" : "#1f2937",
                    fontSize: "1.1rem",
                  }}
                >
                  {todo.title}
                </span>
              </div>
              <button
                data-testid="delete-todo"
                onClick$={() => handleDelete(todo.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  padding: "0.25rem 0.5rem",
                }}
              >
                &times;
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Optimistic Todo App",
};
