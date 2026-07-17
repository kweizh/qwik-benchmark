import type { RequestHandler } from "@builder.io/qwik-city";
import fs from "fs";
import path from "path";
import { db } from "../../../../utils/db";

export const onPost: RequestHandler = async (requestEvent) => {
  const slug = requestEvent.params.slug;

  let body: any;
  try {
    body = await requestEvent.parseBody();
  } catch {
    // parseBody might fail if body is empty or malformed
  }

  if (!body || typeof body !== "object") {
    // Fallback manual parsing
    try {
      const text = await requestEvent.request.text();
      try {
        body = JSON.parse(text);
      } catch {
        const params = new URLSearchParams(text);
        body = {};
        for (const [key, val] of params.entries()) {
          body[key] = val;
        }
      }
    } catch {
      throw requestEvent.error(400, "Invalid request body");
    }
  }

  const content = body.content;
  const user = body.user;

  if (typeof content !== "string" || typeof user !== "string") {
    throw requestEvent.error(400, "content and user fields are required and must be strings");
  }

  const wikiPagesDir = "/home/user/qwik-app/wiki-pages";
  const filePath = path.join(wikiPagesDir, `${slug}.md`);

  // Simple path traversal check to ensure the path is within the wikiPagesDir
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(wikiPagesDir))) {
    throw requestEvent.error(400, "Invalid slug");
  }

  // Create the directory if it does not exist
  await fs.promises.mkdir(wikiPagesDir, { recursive: true });

  // Save the markdown file
  await fs.promises.writeFile(resolvedPath, content, "utf-8");

  // Insert a revision log entry into the SQLite database
  const timestamp = Date.now();
  const contentLength = content.length;

  const stmt = db.prepare(`
    INSERT INTO revisions (slug, user, timestamp, content_length)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(slug, user, timestamp, contentLength);

  // Check how to respond (JSON or Redirect)
  const acceptHeader = requestEvent.request.headers.get("accept") || "";
  const contentTypeHeader = requestEvent.request.headers.get("content-type") || "";

  if (
    acceptHeader.includes("application/json") ||
    contentTypeHeader.includes("application/json")
  ) {
    requestEvent.json(200, { success: true });
    return;
  } else {
    requestEvent.redirect(303, `/wiki/${slug}`);
    return;
  }
};
