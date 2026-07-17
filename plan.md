# Qwik Framework Benchmark Research Report

This report provides a comprehensive, technically detailed analysis of the **Qwik** web framework (`http://qwik.dev/`) to support the creation of robust, high-quality evaluation datasets and container-friendly benchmark tasks for AI coding agents.

---

## 1. Library Overview

### Description
Qwik is a modern, high-performance web framework designed to deliver instant page loads (regardless of application size or complexity) by completely eliminating eager hydration. Instead, Qwik introduces **Resumability**—the ability to pause execution on the server (during Server-Side Rendering) and resume it seamlessly on the client without executing eager JavaScript on startup. It achieves this by serializing the application's execution state, reactivity graph, and event listeners directly into the HTML, downloading and executing JavaScript code strictly on-demand (e.g., when a user interacts with a component).

### Ecosystem Role
Qwik fits into the meta-framework space alongside Next.js, Nuxt, and SvelteKit. It is split into two primary layers:
*   **Qwik Core**: The underlying rendering engine and reactivity system that defines components, reactive state (`useSignal`, `useStore`), and lifecycle hooks (`useTask$`, `useVisibleTask$`).
*   **Qwik City**: The official meta-framework that provides directory-based routing, layout management, middleware, server-side data loading (`routeLoader$`), form actions (`routeAction$`), and static site generation (SSG).

### Project Setup (Container-Friendly, Non-Interactive)
In non-interactive environments (such as autonomous agents running inside a Docker container), interactive prompts must be bypassed. There are three primary paths to initialize a Qwik City project without user intervention:

#### Option A: Command-Line Arguments (Preferred)
The official `create-qwik` CLI supports a non-interactive command mode where the starter ID and directory name are specified directly:
```bash
# Syntax: npm create qwik@latest <starter> <projectName> [flags]
# Common starters: 'empty' (routing included, no demo code), 'basic' (includes simple demo)
npm create qwik@latest empty qwik-app -- --yes --no-git --no-install
```
*Note: The `--` separator passes flags like `--yes` (accept all defaults), `--no-git` (skip Git repository initialization), and `--no-install` (skip immediate package installation) directly to the underlying generator.*

Once scaffolded, you can install the dependencies and build manually:
```bash
cd qwik-app
npm install
npm run build
```

#### Option B: Fully Non-Interactive Vite Template
An alternative that is 100% non-interactive and does not require the `create-qwik` CLI wizard is using the official Vite template:
```bash
npm create vite@latest qwik-app -- --template qwik-ts
cd qwik-app
npm install
```
*Note: This creates a client-only, single-page Qwik application without Qwik City routing. For full-stack meta-framework tasks, Option A or manual scaffolding is preferred.*

#### Option C: Manual Scaffolding (Boilerplate)
For complete control, an agent can manually write the configuration files. Below is the minimum configuration required to boot a Qwik City app:

`package.json`:
```json
{
  "name": "qwik-app",
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite --mode ssr",
    "build": "vite build",
    "preview": "vite preview",
    "start": "vite"
  },
  "dependencies": {
    "@builder.io/qwik": "^1.11.0",
    "@builder.io/qwik-city": "^1.11.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vite-tsconfig-paths": "^4.0.0"
  }
}
```

`vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import { qwikVite } from '@builder.io/qwik/optimizer';
import { qwikCity } from '@builder.io/qwik-city/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(() => {
  return {
    plugins: [
      qwikCity(),
      qwikVite(),
      tsconfigPaths()
    ]
  };
});
```

---

## 2. Core Primitives & APIs

### Key Concepts & Documentation Links
*   [`component$()`](https://qwik.dev/docs/core/overview/): Declares a Qwik component. The trailing `$` signals to the Optimizer that this is a lazy-loading boundary.
*   [`useSignal()`](https://qwik.dev/docs/core/state/): Declares reactive state for a single primitive value or flat object.
*   [`useStore()`](https://qwik.dev/docs/core/state/): Declares a deeply reactive JavaScript object, ideal for nested objects and arrays.
*   [`useTask$()`](https://qwik.dev/docs/core/tasks/): Runs synchronous or asynchronous work during component initialization or when tracked state changes (executes on both server and client).
*   [`useVisibleTask$()`](https://qwik.dev/docs/core/tasks/): Runs code exclusively on the client after the component becomes visible in the viewport.
*   [`useResource$()`](https://qwik.dev/docs/core/state/#useresource): Resolves asynchronous data fetching without blocking the initial rendering pipeline.
*   [`routeLoader$()`](https://qwik.dev/docs/route-loader/): Server-only loader that fetches data before rendering the route.
*   [`routeAction$()`](https://qwik.dev/docs/action/): Server-only form action handler that processes form submissions and mutations.
*   [`server$()`](https://qwik.dev/docs/server$/): Defines an RPC (Remote Procedure Call) function that executes exclusively on the server but is callable from the client.
*   [`$()`](https://qwik.dev/docs/advanced/qrl/): The optimizer marker that manually wraps a function into a serializable QRL (Qwik Reference Language) reference.

---

### Detailed Explanations & Code Snippets

#### 1. Reactivity & State (`useSignal` & `useStore`)
Qwik's reactivity is fine-grained. When a signal value changes, Qwik re-renders only the DOM nodes that directly reference that signal, bypassing component-tree re-rendering entirely.

```typescript
import { component$, useSignal, useStore, useComputed$ } from '@builder.io/qwik';

// Definition of the state structure
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  couponApplied: boolean;
}

export const ShoppingCart = component$(() => {
  // useSignal: best for primitives, flat objects, or DOM element references
  const customerName = useSignal<string>('Guest');

  // useStore: best for arrays, nested structures, and complex objects
  const cart = useStore<CartStore>({
    items: [
      { id: '1', name: 'Qwik Book', price: 29.99, quantity: 1 },
      { id: '2', name: 'Resumability Poster', price: 9.99, quantity: 2 }
    ],
    couponApplied: false
  });

  // useComputed$: synchronous derived state (automatically tracks dependencies)
  const cartTotal = useComputed$(() => {
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return cart.couponApplied ? subtotal * 0.9 : subtotal;
  });

  return (
    <div class="p-4 border rounded-lg shadow-sm">
      <h2 class="text-xl font-bold">Cart for {customerName.value}</h2>

      <ul class="my-4 space-y-2">
        {cart.items.map((item) => (
          <li key={item.id} class="flex justify-between items-center">
            <span>{item.name} (${item.price})</span>
            <div class="flex items-center gap-2">
              <button
                class="px-2 py-1 bg-gray-200 rounded"
                onClick$={() => {
                  if (item.quantity > 1) item.quantity--;
                }}
              >
                -
              </button>
              <span>{item.quantity}</span>
              <button
                class="px-2 py-1 bg-gray-200 rounded"
                onClick$={() => item.quantity++}
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div class="mt-4 pt-4 border-t flex justify-between items-center">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={cart.couponApplied}
            onChange$={(e, currentTarget) => {
              cart.couponApplied = currentTarget.checked;
            }}
          />
          Apply 10% Coupon
        </label>
        <span class="font-bold text-lg">Total: ${cartTotal.value.toFixed(2)}</span>
      </div>
    </div>
  );
});
```

---

#### 2. Component Lifecycles & Side-Effects (`useTask$` vs `useVisibleTask$`)
Understanding the execution boundary of tasks is crucial. `useTask$` runs before rendering (and can block it), whereas `useVisibleTask$` executes only in the browser after the component becomes visible.

```typescript
import { component$, useSignal, useTask$, useVisibleTask$ } from '@builder.io/qwik';

export const DelayedLogger = component$(() => {
  const count = useSignal<number>(0);
  const logHistory = useSignal<string[]>([]);
  const timerActive = useSignal<boolean>(false);

  // useTask$: Runs on the server during SSR, and on the client when tracked state changes.
  // Can be asynchronous, and blocks rendering until resolved if run during initial load.
  useTask$(({ track, cleanup }) => {
    // Explicitly track changes to 'count'
    const currentCount = track(() => count.value);

    logHistory.value = [...logHistory.value, `Count changed to: ${currentCount} (Server/Client)`];

    // Cleanup function: runs before the next task execution or when the component is unmounted
    cleanup(() => {
      console.log('useTask$ cleanup executed');
    });
  });

  // useVisibleTask$: Runs ONLY on the client after the component becomes visible in the viewport.
  // Used for DOM manipulation, timers, and browser-only APIs. Does NOT block initial SSR rendering.
  useVisibleTask$(({ track, cleanup }) => {
    const isTimerRunning = track(() => timerActive.value);
    let intervalId: any;

    if (isTimerRunning) {
      logHistory.value = [...logHistory.value, 'Timer started (Client-only)'];
      intervalId = setInterval(() => {
        count.value++;
      }, 1000);
    }

    cleanup(() => {
      if (intervalId) {
        clearInterval(intervalId);
        logHistory.value = [...logHistory.value, 'Timer stopped (Client-only)'];
      }
    });
  });

  return (
    <div class="p-4 border border-dashed rounded-md">
      <h3 class="text-lg font-semibold">Lifecycle Logger</h3>
      <p class="text-2xl font-mono my-2">Value: {count.value}</p>

      <div class="flex gap-2 my-2">
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded"
          onClick$={() => count.value++}
        >
          Increment
        </button>
        <button
          class="px-4 py-2 bg-purple-500 text-white rounded"
          onClick$={() => timerActive.value = !timerActive.value}
        >
          {timerActive.value ? 'Stop Auto-Timer' : 'Start Auto-Timer'}
        </button>
      </div>

      <div class="mt-4 bg-gray-100 p-2 rounded h-40 overflow-y-auto font-mono text-xs">
        {logHistory.value.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
      </div>
    </div>
  );
});
```

---

#### 3. Server-Side Data Flow & Actions (`routeLoader$`, `routeAction$`, `server$`)
Qwik City provides robust server-side abstractions that keep server-only code (like SQL queries, file system access, or secure API keys) separated from browser-side bundles.

```typescript
import { component$ } from '@builder.io/qwik';
import { routeLoader$, routeAction$, Form, zod$, z } from '@builder.io/qwik-city';

// Mock database interface
interface User {
  id: number;
  name: string;
  email: string;
}

const mockUsersDb: User[] = [
  { id: 1, name: 'Alice', email: 'alice@qwik.dev' },
  { id: 2, name: 'Bob', email: 'bob@qwik.dev' }
];

// 1. routeLoader$: Fetches data on the server before rendering the route.
// Access to 'RequestEvent' provides request headers, parameters, and env variables.
export const useUsersLoader = routeLoader$(async (requestEvent) => {
  // Safe to perform DB queries or read secret environment variables here
  const apiKey = requestEvent.env.get('PRIVATE_API_KEY');
  console.log(`Fetching users server-side. Private Key present: ${!!apiKey}`);
  return mockUsersDb;
});

// 2. routeAction$: Handles form submissions or mutations on the server.
// Built-in validation via 'zod$' ensures data safety.
export const useCreateUserAction = routeAction$(
  async (formData, requestEvent) => {
    // This code executes strictly on the server
    const newUser: User = {
      id: mockUsersDb.length + 1,
      name: formData.name,
      email: formData.email
    };
    mockUsersDb.push(newUser);

    return {
      success: true,
      user: newUser
    };
  },
  // Zod schema validator
  zod$({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address')
  })
);

export default component$(() => {
  // Call the loader and action hooks to get reactive signals
  const usersSignal = useUsersLoader();
  const createUserAction = useCreateUserAction();

  return (
    <div class="p-6 max-w-lg mx-auto">
      <h1 class="text-2xl font-bold mb-4">User Directory</h1>

      {/* List users fetched by the loader */}
      <ul class="mb-6 divide-y">
        {usersSignal.value.map((user) => (
          <li key={user.id} class="py-2 flex justify-between">
            <span class="font-medium">{user.name}</span>
            <span class="text-gray-500">{user.email}</span>
          </li>
        ))}
      </ul>

      {/* Form Submission using Qwik City's progressive enhancement <Form> component */}
      <h2 class="text-xl font-semibold mb-2">Add New User</h2>
      <Form action={createUserAction} class="space-y-4">
        <div>
          <label class="block text-sm font-medium">Name</label>
          <input
            type="text"
            name="name"
            class="w-full border p-2 rounded"
            value={createUserAction.formData?.get('name')}
          />
          {createUserAction.value?.failed && (
            <p class="text-red-500 text-xs">{createUserAction.value.fieldErrors?.name}</p>
          )}
        </div>

        <div>
          <label class="block text-sm font-medium">Email</label>
          <input
            type="email"
            name="email"
            class="w-full border p-2 rounded"
            value={createUserAction.formData?.get('email')}
          />
          {createUserAction.value?.failed && (
            <p class="text-red-500 text-xs">{createUserAction.value.fieldErrors?.email}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={createUserAction.isRunning}
          class="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
        >
          {createUserAction.isRunning ? 'Adding...' : 'Add User'}
        </button>
      </Form>

      {createUserAction.value?.success && (
        <div class="mt-4 p-3 bg-green-100 text-green-800 rounded">
          Successfully added user: {createUserAction.value.user?.name}!
        </div>
      )}
    </div>
  );
});
```

---

## 3. Real-World Use Cases & Templates

### Representative Templates & Example Projects
*   [Qwik TodoMVC Starter](https://github.com/onwidget/awesome-qwik): Standard, self-contained implementation of TodoMVC showcasing Qwik's fine-grained reactivity, store management, and event handling.
*   [Qwik City Basic App Demo](https://qwik.dev/docs/project-structure/): Scaffolds with a structured directory layout (`src/routes/`), showing layout nesting, route parameters, and global scoped styling.
*   [Qwik Tailwind Starter](https://qwik.dev/docs/integrations/tailwind/): Demonstrates how to integrate Tailwind CSS v4 using Vite's native `@tailwindcss/vite` plugin inside a Qwik application.

### Container-Friendly Integration Patterns
For running apps inside a containerized environment (e.g., Docker, local Kubernetes, or CI environments) without external cloud dependencies:
*   **Database**: SQLite integrated via **Prisma** or **better-sqlite3**. Database writes and reads are executed inside server-only boundaries (`routeLoader$` or `routeAction$`), using a local SQLite file (e.g., `file:./dev.db`) mounted in the container.
*   **REST/JSON Endpoints**: Qwik City's `index.ts` files act as direct HTTP handlers (using `RequestHandler` exports like `onGet`, `onPost`). This allows the container to serve pure RESTful APIs without needing an external Express/NestJS server.
*   **Asset Storage**: Local file system storage using Node's `fs/promises` accessed inside `routeAction$` handlers, writing files directly to a mounted public directory (`/public/uploads`).

---

## 4. Developer Friction Points

### 1. Code(3) Serialization Error (Lexical Boundary Cross)
*   **Symptom/Error String**: `Code(3): Only primitive and object literals can be serialized, but got <value>` or `Trying to serialize a function...`
*   **Underlying Cause**: Qwik's Optimizer extracts code blocks following a `$` into separate, lazy-loaded chunks. Any variables captured from the outer scope must cross a serialization boundary. Custom class instances, Maps, Sets, and standard functions are not JSON-serializable by default, causing compilation or runtime crashes.
*   **Resolution**:
    1.  Convert custom classes or maps into plain, flat JSON-serializable objects or array structures.
    2.  Wrap callback functions in the `$()` optimizer helper to turn them into serializable QRLs.
    3.  Wrap strictly browser-only non-serializable objects (like third-party library instances) in `noSerialize()` to exclude them from the serialization graph.
*   **Link**: [Strange Behaviour: Code(3) Serialization Issue #4371](https://github.com/QwikDev/qwik/issues/4371)

### 2. Code(20) Asynchronous Hook Invocation Error
*   **Symptom/Error String**: `Code(20): Calling a 'use*()' method outside 'component$(() => { HERE })' is not allowed.`
*   **Underlying Cause**: Qwik hooks (e.g., `useSignal`, `useStore`, `useTask$`) rely on the synchronous execution of a component's render function to track the active component instance and bind dependencies. Attempting to call a hook inside an asynchronous callback (e.g., inside `setTimeout`, after an `await`), or inside a non-component function (e.g., inside `routeLoader$`), violates this lifecycle constraint.
*   **Resolution**: Always declare and execute all `use*` hooks synchronously at the top level of the `component$` body or within custom hooks that are themselves invoked synchronously during component rendering.
*   **Link**: [Calling use* inside routeLoader$ Issue #61](https://github.com/QwikDev/qwik-evolution/issues/61)

### 3. Server-Only Module Leaks into Client-Side Bundles
*   **Symptom/Error String**: `Module externalized for browser compatibility: ...` or `Error: Cannot find module 'fs'` during Vite production builds.
*   **Underlying Cause**: When importing node-specific modules (e.g., `fs`, `path`, or native database drivers) at the top level of a component file, the bundler analyzes these imports. If any client-side code (like an event handler or JSX template) references those modules or variables that depend on them, the optimizer drags the server-only module into the client chunk, causing a build failure.
*   **Resolution**: Keep server-only imports and logic strictly inside `routeLoader$`, `routeAction$`, or `server$` scopes. Alternatively, place server-only code in a separate `.server.ts` file and import it; the Qwik Optimizer automatically tree-shakes `.server` imports from client-side bundles.
*   **Link**: [Storybook/Vite Node Module Externalization Issue #7325](https://github.com/QwikDev/qwik/issues/7325)

---

## 5. Evaluation Ideas (Benchmark Tasks)

Here is a list of benchmark tasks designed for execution inside self-contained, non-interactive Docker containers (using local SQLite and state):

### Simple
1.  **Reactive Click Multiplier**: Create a component that multiplies its step increment factor dynamically using `useSignal` and synchronous derived state with `useComputed$`. (Difficulty: Simple)
2.  **Product Search Filter**: Implement a client-side text search filter that filters a static array of products in real-time as the user types, using `useSignal`. (Difficulty: Simple)

### Medium
3.  **Local Storage Persistent Todo**: Build a Todo application that persists items to the browser's `localStorage` using `useVisibleTask$` to handle client-side initialization and updates. (Difficulty: Medium)
4.  **Mock Weather Widget**: Create a component that fetches weather metrics from a local Qwik City JSON endpoint (`/api/weather`) using `useResource$` and renders the loading, resolved, and rejected states using `<Resource />`. (Difficulty: Medium)
5.  **Multi-Step Registration Form**: Implement a multi-step user registration form that uses a Qwik City `routeAction$` to validate inputs (e.g., password strength and email match) and returns field-specific validation errors. (Difficulty: Medium)

### Complex
6.  **SQLite Blog System**: Build a self-contained blog using a local SQLite file and Prisma where `routeLoader$` fetches all posts on the server, and a progressive `routeAction$` creates new posts, ensuring no database modules leak into client bundles. (Difficulty: Complex)
7.  **SSE Collaborative Notepad**: Create a shared text notepad component that establishes a Server-Sent Events (SSE) connection with a local Qwik City endpoint inside a `useVisibleTask$`, synchronizing real-time changes across browser tabs. (Difficulty: Complex)

---

## 6. Sources

1.  [Qwik Getting Started Guide](https://qwik.dev/docs/getting-started/): Official guide for installing Qwik, running the CLI, and understanding initial project structure.
2.  [Qwik Project Structure](https://qwik.dev/docs/project-structure/): Structure of a standard Qwik City application, including configuration files and routing directories.
3.  [Qwik State Management](https://qwik.dev/docs/core/state/): Detailed documentation on reactivity, `useSignal`, `useStore`, and context APIs.
4.  [Qwik Tasks and Lifecycle](https://qwik.dev/docs/core/tasks/): Explains the differences, timing, and execution rules of `useTask$` and `useVisibleTask$`.
5.  [Qwik City Route Loaders](https://qwik.dev/docs/route-loader/): Documentation on server-side data loading, RequestEvent, and route integration.
6.  [Qwik City Route Actions](https://qwik.dev/docs/action/): Form submissions, server actions, and schema validations.
7.  [Qwik City Server$ RPC](https://qwik.dev/docs/server$/): RPC mechanism mapping client-side calls to server-side executions.
8.  [Qwik Optimizer Advanced Rules](https://qwik.dev/docs/advanced/optimizer/): Deep dive into Rust-based compiler transformations, the `$` suffix, and code extraction.
9.  [Qwik Serialization Guidelines](https://qwik.dev/docs/guides/serialization/): Explanation of serialization boundaries, lexical scopes, and serializable data rules.
10. [Qwik City Endpoints](https://qwik.dev/docs/endpoints/): Creating custom API handlers (`onGet`, `onPost`) and handling request events.
11. [GitHub Issue #4371](https://github.com/QwikDev/qwik/issues/4371): Discussion and analysis of the `Code(3)` serialization error.
12. [GitHub Issue #61 (Qwik-Evolution)](https://github.com/QwikDev/qwik-evolution/issues/61): Discussion on the hook context rules and `Code(20)` errors.
