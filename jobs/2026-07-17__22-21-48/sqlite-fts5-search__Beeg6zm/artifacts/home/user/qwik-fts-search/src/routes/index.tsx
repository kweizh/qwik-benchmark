import {
  component$,
  useSignal,
  useTask$,
  $,
  type QRL,
} from "@builder.io/qwik";
import {
  routeLoader$,
  useNavigate,
  useLocation,
  type DocumentHead,
} from "@builder.io/qwik-city";

export const useSearch = routeLoader$(async (requestEvent) => {
  const raw = requestEvent.query.get("q");
  const q = (raw ?? "").trim();

  // Empty-query state: do not run a search.
  if (!q) {
    return { q: "", ran: false, total: 0, results: [] as Result[] };
  }

  const { searchDocuments } = await import("~/server/db");
  const { total, results } = searchDocuments(q);
  return { q, ran: true, total, results };
});

interface Result {
  title: string;
  snippet: string;
}

export default component$(() => {
  const data = useSearch();
  const loc = useLocation();
  const nav = useNavigate();

  // The controlled input value.
  const inputValue = useSignal(data.value?.q ?? "");
  // Debounce timer handle (client-only).
  const timer = useSignal<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep the input in sync with the URL `q` param (e.g. on initial load, back/forward).
  useTask$(({ track }) => {
    const urlQ = track(() => loc.url.searchParams.get("q") ?? "");
    if (urlQ.trim() !== inputValue.value.trim()) {
      inputValue.value = urlQ;
    }
  });

  // Debounced input handler: update the `q` URL query param as the user types.
  const onInput = $((e: Event) => {
    const target = e.target as HTMLInputElement;
    inputValue.value = target.value;

    if (timer.value) {
      clearTimeout(timer.value);
    }
    timer.value = setTimeout(() => {
      const value = target.value.trim();
      const target_url = value
        ? `/?q=${encodeURIComponent(value)}`
        : "/";
      nav(target_url, { type: "replaceState" });
    }, 300) as unknown as ReturnType<typeof setTimeout>;
  });

  return (
    <main class="search-page">
      <h1>Full-Text Document Search</h1>
      <p class="subtitle">
        Search the document corpus using SQLite FTS5 full-text search.
      </p>

      <form
        preventdefault:submit
        role="search"
      >
        <input
          type="search"
          name="q"
          aria-label="Search documents"
          placeholder="Search the document corpus…"
          autoComplete="off"
          value={inputValue.value}
          onInput$={onInput as QRL<(e: Event) => void>}
          autofocus
        />
      </form>

      {!data.value.ran && (
        <p class="state empty-state">Enter a search term to begin.</p>
      )}

      {data.value.ran && (
        <>
          <p class="result-count">{`${data.value.total} results`}</p>

          {data.value.total === 0 ? (
            <p class="state no-results">
              No results found for &ldquo;{data.value.q}&rdquo;.
            </p>
          ) : (
            <ol class="results">
              {data.value.results.map((result, index) => (
                <li class="result" key={result.title}>
                  <span class="rank">{index + 1}</span>
                  <div class="result-body">
                    <h2 class="result-title">{result.title}</h2>
                    <p
                      class="snippet"
                      dangerouslySetInnerHTML={result.snippet}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
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
      content: "Server-rendered full-text search powered by SQLite FTS5.",
    },
  ],
};