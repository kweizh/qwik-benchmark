import type { RequestHandler } from '@builder.io/qwik-city';
import { db } from '../../../db';

export const onPost: RequestHandler = async ({ parseBody, json }) => {
  try {
    const body = (await parseBody()) as any;
    const title = body?.title;

    if (typeof title !== 'string' || title.trim() === '') {
      json(400, { error: 'Title is required and must be a non-empty string' });
      return;
    }

    const insertTransaction = db.transaction((taskTitle: string) => {
      const row = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE column = 'TODO'").get() as { count: number };
      const position = row.count;
      const result = db.prepare("INSERT INTO tasks (title, column, position) VALUES (?, 'TODO', ?)").run(taskTitle, position);
      return {
        id: Number(result.lastInsertRowid),
        title: taskTitle,
        column: 'TODO' as const,
        position,
      };
    });

    const newTask = insertTransaction(title.trim());
    json(201, newTask);
  } catch (err: any) {
    json(500, { error: err.message });
  }
};
