# Flash-Free Theme & Locale Preferences with Qwik City Middleware

## Background
You are building a small Qwik City (Qwik meta-framework) application that lets a visitor choose a color **theme** (`light` or `dark`) and a UI **language / locale** (`en` or `es`). Both preferences must be persisted in **cookies** and resolved **on the server during SSR**, so that the very first HTML the server returns already reflects the correct theme and translated text — with **no client-side flash** and without requiring any JavaScript to run in the browser.

A scaffolded, dependency-installed Qwik City project already exists at the project path. Your job is to implement the preference feature end-to-end.

## Requirements
- A shared route **middleware** (an `onRequest` handler in the root `layout.tsx`) must read the `theme` and `locale` cookies on every request, resolve them to valid values (falling back to the defaults when a cookie is missing or invalid), and make the resolved values available to the rest of the request.
- A **`routeLoader$`** in the root layout must expose the resolved `{ theme, locale }` for the current request, and the layout must publish them through a Qwik **Context** (`createContextId` + `useContextProvider`) so any descendant component can consume them with `useContext`.
- The home page (`/`) must render its user-facing text by looking up keys in a **local, in-repo translation dictionary** (a plain object/JSON in the source tree). No network calls, no third-party i18n service.
- A **`routeAction$`** (submitted via the Qwik City `<Form>` component) must persist the chosen `theme` and `locale` into cookies so the choice survives across requests.
- The `<html>` element of every server-rendered response must carry a `data-theme` attribute (`light`/`dark`) and a `lang` attribute (`en`/`es`) that match the resolved preferences on the **first** server response.

## Implementation Hints
- Qwik City's `onRequest` middleware, `routeLoader$`, and `routeAction$` all receive the `RequestEvent`, which exposes `cookie.get(...)` / `cookie.set(...)`. Use `sharedMap` to pass request-scoped data from the middleware to the loader. Calling the request event's `locale(...)` sets the request locale, which the SSR entry can read via `serverData.locale`.
- The only way to set attributes on the `<html>` container element is through `containerAttributes` in `src/entry.ssr.tsx`. The render options expose `serverData` (including `serverData.requestHeaders` and `serverData.locale`), which you can use to compute `data-theme` and `lang` before rendering. Remember to keep the existing `...opts.containerAttributes` so routing still works.
- Keep server-only preference logic inside the middleware/loader/action boundaries so nothing leaks into the client bundle, and consume the shared Context for rendering translated copy.
- Cookie names are exactly `theme` and `locale`. Valid values: `theme` ∈ {`light`, `dark`}, `locale` ∈ {`en`, `es`}. Defaults when absent/invalid: `theme=light`, `locale=en`. Persist the cookies with `path=/` so they apply to every route.
- The local dictionary must provide at least these keys, with exactly these values, and the home page must render both the `title` and the `greeting` for the resolved locale somewhere in the page HTML:
  - `en`: `title` = `Preferences`, `greeting` = `Hello`
  - `es`: `title` = `Preferencias`, `greeting` = `Hola`
- The preference `<Form>` must submit two fields named exactly `theme` and `locale` to your `routeAction$`.
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev -- --port 3000 --host 0.0.0.0`
- Port: `3000`
- Routes / behavior to expose:
  - `GET /`: server-renders the home page. The `<html>` tag includes `data-theme="<theme>"` and `lang="<locale>"` matching the request cookies (defaults `light`/`en` when no cookies are sent). The page body includes the `title` and `greeting` strings for the resolved locale, and contains the preference `<Form>`.
  - The `<Form>`'s `routeAction$` accepts a POST with form fields `theme` and `locale`; on success it sets the `theme` and `locale` cookies (with `path=/`) to the submitted values so subsequent requests reflect the new preferences.

