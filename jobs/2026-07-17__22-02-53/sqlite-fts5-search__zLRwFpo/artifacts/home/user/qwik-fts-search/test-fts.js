import Database from 'better-sqlite3';

const db = new Database(':memory:');
db.exec(`
  CREATE VIRTUAL TABLE documents USING fts5(title, body);
`);

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
for (const doc of seedDocs) {
  insert.run(doc.title, doc.body);
}

// Let's test a query for 'Introduction'
const q1 = 'Introduction';
const results1 = db.prepare(`
  SELECT title, body,
         snippet(documents, -1, '<mark>', '</mark>', '...', 10) as snippet_auto,
         snippet(documents, 1, '<mark>', '</mark>', '...', 10) as snippet_body,
         highlight(documents, 0, '<mark>', '</mark>') as highlight_title,
         highlight(documents, 1, '<mark>', '</mark>') as highlight_body,
         rank
  FROM documents
  WHERE documents MATCH ?
  ORDER BY rank
`).all(q1);

console.log('Query: "Introduction"');
console.log(JSON.stringify(results1, null, 2));

// Let's test a query for 'SQLite'
const q2 = 'SQLite';
const results2 = db.prepare(`
  SELECT title, body,
         snippet(documents, -1, '<mark>', '</mark>', '...', 10) as snippet_auto,
         snippet(documents, 1, '<mark>', '</mark>', '...', 10) as snippet_body,
         highlight(documents, 0, '<mark>', '</mark>') as highlight_title,
         highlight(documents, 1, '<mark>', '</mark>') as highlight_body,
         rank
  FROM documents
  WHERE documents MATCH ?
  ORDER BY rank
`).all(q2);

console.log('Query: "SQLite"');
console.log(JSON.stringify(results2, null, 2));
