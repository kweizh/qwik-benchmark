import type { RequestHandler } from "@builder.io/qwik-city";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { insertRevision } from "~/db";

export const onPost: RequestHandler = async ({ params, request, redirect, json }) => {
  const slug = params.slug;

  let content: string;
  let user: string;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    content = body.content;
    user = body.user;
  } else {
    // Form-urlencoded
    const text = await request.text();
    const searchParams = new URLSearchParams(text);
    content = searchParams.get("content") || "";
    user = searchParams.get("user") || "";
  }

  if (!content || !user) {
    json(400, { error: "Missing required fields: content and user" });
    return;
  }

  // Ensure the wiki-pages directory exists
  const dir = `/home/user/qwik-app/wiki-pages`;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const filePath = `${dir}/${slug}.md`;

  // Write the markdown file
  writeFileSync(filePath, content, "utf-8");

  // Insert revision log entry
  insertRevision(slug, user, content);

  // Return success JSON or redirect
  // Check if the client prefers JSON or redirect
  const accept = request.headers.get("accept") || "";
  if (accept.includes("application/json")) {
    json(201, { success: true });
  } else {
    throw redirect(302, `/wiki/${slug}/`);
  }
};
