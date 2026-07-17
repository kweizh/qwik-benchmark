import type { RequestHandler } from '@builder.io/qwik-city';
import { db } from '../../../db';

export const onPost: RequestHandler = async ({ request, parseBody, json }) => {
  try {
    let title: any;
    try {
      const body = await parseBody() as any;
      if (body && typeof body === 'object') {
        title = body.title;
      }
    } catch {
      // fallback
    }

    if (title === undefined) {
      try {
        const jsonBody = await request.json();
        title = jsonBody?.title;
      } catch {
        // fallback
      }
    }

    if (typeof title !== 'string' || !title.trim()) {
      json(400, { error: 'Title is required and must be a non-empty string' });
      return;
    }

    const trimmedTitle = title.trim();

    const result = db.transaction(() => {
      const row = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE column = 'TODO'").get() as { count: number };
      const position = row.count;

      const runResult = db.prepare("INSERT INTO tasks (title, column, position) VALUES (?, 'TODO', ?)").run(trimmedTitle, position);
      const id = Number(runResult.lastInsertRowid);

      return {
        id,
        title: trimmedTitle,
        column: 'TODO' as const,
        position,
      };
    })();

    json(201, result);
  } catch (error: any) {
    json(500, { error: error.message || 'Internal Server Error' });
  }
};
