import { component$, useSignal, useTask$ } from "@builder.io/qwik";
import { routeLoader$, useLocation, useNavigate, type DocumentHead } from "@builder.io/qwik-city";

export const useSearchLoader = routeLoader$(async (requestEvent) => {
  const q = requestEvent.query.get('q');
  
  if (q === null || q === undefined || q.trim() === '') {
    return {
      results: [],
      total: 0,
      query: '',
      isEmpty: true,
    };
  }

  // Keep all better-sqlite3 and node: imports strictly inside server-only boundaries (routeLoader$)
  const { join } = await import('node:path');
  const Database = (await import('better-sqlite3')).default;
  const dbPath = join(process.cwd(), 'search.db');

  let db = (globalThis as any)._sqliteDb;
  if (!db) {
    db = new Database(dbPath);
    (globalThis as any)._sqliteDb = db;

    // Initialize table and seed
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS documents USING fts5(title, body);
    `);
    const countRow = db.prepare('SELECT count(*) as count FROM documents').get() as { count: number };
    if (countRow.count === 0) {
      const seedDocs = [
        { title: 'Introduction to SQLite', body: 'SQLite is a lightweight embedded database engine used in many applications.' },
        { title: 'Full Text Search with FTS5', body: 'The FTS5 extension enables fast full text search over documents using an inverted index.' },
        { title: 'Getting Started with Qwik', body: 'Qwik is a resumable web framework that delivers instant loading web applications.' },
        { title: 'Reactive State in Qwik', body: 'Use signals and stores to manage reactive state inside Qwik components.' },
        { title: 'Building REST APIs', body: 'Design clean REST endpoints to serve JSON data to client applications.' },
        { title: 'Database Indexing Basics', body: 'Indexes speed up query performance in relational databases like SQLite and Postgres.' },
        { title: 'Server Side Rendering', body: 'Server side rendering improves performance and search engine visibility for web applications.' },
        { title: 'Web Performance Tips', body: 'Reduce JavaScript to improve web performance and loading speed for users.' },
      ];
      const insert = db.prepare('INSERT INTO documents (title, body) VALUES (?, ?)');
      const insertMany = db.transaction((docs) => {
        for (const doc of docs) {
          insert.run(doc.title, doc.body);
        }
      });
      insertMany(seedDocs);
    }
  }

  try {
    // Run the MATCH query and fetch results.
    // BM25 ranking is used. FTS5 automatically sorts by rank if we ORDER BY rank.
    const results = db.prepare(`
      SELECT 
        title, 
        body,
        snippet(documents, 1, '<mark>', '</mark>', '...', 64) as snippet_body,
        snippet(documents, 0, '<mark>', '</mark>', '...', 64) as snippet_title,
        snippet(documents, -1, '<mark>', '</mark>', '...', 64) as snippet_auto,
        rank
      FROM documents
      WHERE documents MATCH ?
      ORDER BY rank
    `).all(q) as Array<{
      title: string;
      body: string;
      snippet_body: string;
      snippet_title: string;
      snippet_auto: string;
      rank: number;
    }>;

    // Map results to display
    const mappedResults = results.map((row, index) => {
      // Determine snippet to display (ensure we have at least one <mark> if possible)
      let snippet = row.snippet_body;
      if (!snippet.includes('<mark>')) {
        snippet = row.snippet_auto || row.snippet_title || row.body;
      }
      
      return {
        id: index + 1, // 1-based rank position
        title: row.title,
        body: row.body,
        snippet: snippet,
        rank: row.rank,
      };
    });

    return {
      results: mappedResults,
      total: mappedResults.length,
      query: q,
      isEmpty: false,
    };
  } catch (error) {
    console.error('Search query error:', error);
    return {
      results: [],
      total: 0,
      query: q,
      isEmpty: false,
      error: String(error),
    };
  }
});

export default component$(() => {
  const loc = useLocation();
  const nav = useNavigate();
  const searchLoader = useSearchLoader();

  // Local signal for the search box input
  const query = useSignal(loc.url.searchParams.get('q') || '');

  // Synchronize input value with URL search parameter when URL changes (e.g. back/forward button)
  useTask$(({ track }) => {
    const q = track(() => loc.url.searchParams.get('q') || '');
    query.value = q;
  });

  // Debounce the query signal and update the URL query parameter 'q'
  useTask$(({ track, cleanup }) => {
    const val = track(() => query.value);
    
    // Check if the value is different from the current URL parameter to avoid redundant navigations
    const currentQ = loc.url.searchParams.get('q') || '';
    if (val === currentQ) {
      return;
    }

    const id = setTimeout(() => {
      const params = new URLSearchParams(loc.url.search);
      if (val.trim()) {
        params.set('q', val);
      } else {
        params.delete('q');
      }
      nav(`/?${params.toString()}`);
    }, 300); // 300ms debounce delay

    cleanup(() => clearTimeout(id));
  });

  const data = searchLoader.value;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#1a202c', marginBottom: '0.5rem' }}>Local Document Search</h1>
        <p style={{ color: '#4a5568' }}>Search a SQLite FTS5 index using Qwik City</p>
      </header>

      <main>
        <div style={{ marginBottom: '2rem' }}>
          <input
            type="text"
            placeholder="Type to search documents..."
            value={query.value}
            onInput$={(e) => {
              query.value = (e.target as HTMLInputElement).value;
            }}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '1.1rem',
              border: '2px solid #cbd5e0',
              borderRadius: '8px',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {data.isEmpty ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#718096', fontSize: '1.1rem' }}>
            Enter a search term
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>
              {data.total} results
            </div>

            {data.total === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#718096', border: '1px dashed #e2e8f0', borderRadius: '8px' }}>
                No results found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {data.results.map((result) => (
                  <div
                    key={result.id}
                    style={{
                      padding: '1.5rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#3182ce', backgroundColor: '#ebf8ff', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        Rank Position: {result.id}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>
                        Score: {result.rank.toFixed(4)}
                      </span>
                    </div>
                    <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', color: '#2d3748' }}>
                      {result.title}
                    </h3>
                    <p
                      style={{ margin: 0, color: '#4a5568', lineHeight: '1.5' }}
                      dangerouslySetInnerHTML={result.snippet}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Local Document Search",
  meta: [
    {
      name: "description",
      content: "Full-text document search using SQLite FTS5 and Qwik City",
    },
  ],
};
