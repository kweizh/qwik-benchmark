import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import {
  routeLoader$,
  useLocation,
  useNavigate,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { searchDocuments, type SearchResult } from "~/server/db";

interface SearchLoaderResult {
  q: string;
  total: number;
  results: SearchResult[];
}

export const useSearchResults = routeLoader$<SearchLoaderResult>(
  async (requestEvent) => {
    const raw = requestEvent.query.get("q") ?? "";
    const q = raw.trim();

    if (!q) {
      return { q: "", total: 0, results: [] };
    }

    const results = searchDocuments(q);
    return { q, total: results.length, results };
  },
);

export default component$(() => {
  const searchResults = useSearchResults();
  const loc = useLocation();
  const nav = useNavigate();

  const queryText = useSignal(loc.url.searchParams.get("q") ?? "");
  const debounceTimer = useSignal<number | undefined>(undefined);

  // Keep the input in sync if the URL changes from outside (back/forward nav).
  useTask$(({ track }) => {
    const urlQ = track(() => loc.url.searchParams.get("q")) ?? "";
    queryText.value = urlQ;
  });

  const onInput$ = $((event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    queryText.value = value;

    if (debounceTimer.value !== undefined) {
      window.clearTimeout(debounceTimer.value);
    }

    debounceTimer.value = window.setTimeout(() => {
      const url = new URL(window.location.href);
      if (value.trim()) {
        url.searchParams.set("q", value);
      } else {
        url.searchParams.delete("q");
      }
      nav(`${url.pathname}${url.search}`, { replaceState: true });
    }, 300);
  });

  const { q, total, results } = searchResults.value;

  return (
    <div class="search-page">
      <h1>Full-Text Document Search</h1>

      <input
        type="text"
        class="search-input"
        value={queryText.value}
        onInput$={onInput$}
        placeholder="Search the document corpus…"
        aria-label="Search"
      />

      {q ? (
        <div class="search-results">
          <p class="results-count">{total} results</p>

          {total === 0 ? (
            <p class="no-results">No results found for “{q}”.</p>
          ) : (
            <ol class="results-list">
              {results.map((result) => (
                <li key={result.rank} class="result-item">
                  <span class="result-rank">{result.rank}.</span>{" "}
                  <span class="result-title">{result.title}</span>
                  <p
                    class="result-snippet"
                    dangerouslySetInnerHTML={result.snippet}
                  />
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        <p class="empty-state">Enter a search term to search the document corpus.</p>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Full-Text Document Search",
  meta: [
    {
      name: "description",
      content: "Full-text search over a local document corpus using SQLite FTS5.",
    },
  ],
};
