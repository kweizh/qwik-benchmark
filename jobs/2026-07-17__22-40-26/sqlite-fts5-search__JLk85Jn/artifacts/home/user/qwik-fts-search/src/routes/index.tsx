import {
  $,
  component$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$ } from "@builder.io/qwik-city";

import { searchDocuments } from "../lib/db";

// Server-only route loader. Runs on every request to "/" and reads the
// `q` query parameter via the RequestEvent API. Returns the search
// payload (or an empty payload when no query is supplied).
export const useSearch = routeLoader$((requestEvent) => {
  const raw = requestEvent.query.get("q") ?? "";
  return searchDocuments(raw);
});

export default component$(() => {
  const search = useSearch();
  const inputRef = useSignal<HTMLInputElement>();

  // Keep the visible input value in sync with the URL `q` parameter so
  // back/forward navigation and direct loads are reflected in the box.
  useTask$(({ track }) => {
    track(() => search.value.query);
    const el = inputRef.value;
    if (el && el.value !== search.value.query) {
      el.value = search.value.query;
    }
  });

  // Debounced URL update: as the user types, push the new `q` value into
  // the URL after a short idle period. We push the history entry rather
  // than replacing it so back/forward still works per keystroke.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const el = inputRef.value;
    if (!el) return;

    let debounceId: ReturnType<typeof setTimeout> | undefined;
    let lastSubmitted = el.value;

    const submit = (next: string) => {
      lastSubmitted = next;
      const url = new URL(window.location.href);
      if (next.trim() === "") {
        url.searchParams.delete("q");
      } else {
        url.searchParams.set("q", next);
      }
      window.history.pushState({}, "", url.toString());
      // Trigger a navigation event so the route loader re-runs with the
      // new query string. `popstate` would only fire for back/forward,
      // so we dispatch it manually after pushing state.
      window.dispatchEvent(new PopStateEvent("popstate"));
    };

    const onInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const value = target.value;
      if (debounceId !== undefined) {
        clearTimeout(debounceId);
      }
      debounceId = setTimeout(() => {
        if (value !== lastSubmitted) {
          submit(value);
        }
      }, 200);
    };

    const onPopState = () => {
      const url = new URL(window.location.href);
      const next = url.searchParams.get("q") ?? "";
      if (el.value !== next) {
        el.value = next;
        lastSubmitted = next;
      }
    };

    el.addEventListener("input", onInput);
    window.addEventListener("popstate", onPopState);

    cleanup(() => {
      if (debounceId !== undefined) clearTimeout(debounceId);
      el.removeEventListener("input", onInput);
      window.removeEventListener("popstate", onPopState);
    });
  });

  // Immediate (non-debounced) submit handler for the form. Used when the
  // user presses Enter or the submit button so navigation feels instant.
  const onSubmit = $((event: SubmitEvent) => {
    event.preventDefault();
    const el = inputRef.value;
    if (!el) return;
    const url = new URL(window.location.href);
    const value = el.value;
    if (value.trim() === "") {
      url.searchParams.delete("q");
    } else {
      url.searchParams.set("q", value);
    }
    window.history.pushState({}, "", url.toString());
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  const payload = search.value;

  return (
    <main class="container">
      <h1>Full-Text Document Search</h1>

      <form class="search-form" preventdefault:submit onSubmit$={onSubmit}>
        <input
          ref={inputRef}
          type="search"
          name="q"
          autoComplete="off"
          placeholder="Search documents..."
          aria-label="Search documents"
          defaultValue={payload.query}
        />
        <button type="submit">Search</button>
      </form>

      {payload.query.trim() === "" ? (
        <p class="empty-state">Enter a search term to find documents.</p>
      ) : payload.results.length === 0 ? (
        <p class="empty-state">
          No results found for <strong>{payload.query}</strong>.
        </p>
      ) : (
        <>
          <p class="result-count" data-testid="result-count">
            {payload.total} results
          </p>
          <ol class="results">
            {payload.results.map((result) => (
              <li key={result.rank} class="result">
                <div class="result-meta">
                  <span class="result-rank">#{result.rank}</span>
                  <h2 class="result-title">{result.title}</h2>
                </div>
                <p
                  class="result-snippet"
                  // FTS5 highlight() returns pre-escaped HTML with
                  // <mark> tags around matches. The body content comes
                  // from our seed corpus (no user-supplied HTML), so
                  // rendering it raw is safe here.
                  dangerouslySetInnerHTML={result.snippet}
                />
              </li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
});

export const head: DocumentHead = {
  title: "Full-Text Document Search",
  meta: [
    {
      name: "description",
      content:
        "Search a small document corpus with SQLite FTS5 and Qwik City SSR.",
    },
  ],
};
