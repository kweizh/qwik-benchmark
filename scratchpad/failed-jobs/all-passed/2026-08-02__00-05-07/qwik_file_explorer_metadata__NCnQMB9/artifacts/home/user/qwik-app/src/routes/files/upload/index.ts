import fs from "node:fs";
import path from "node:path";
import type { RequestHandler } from "@builder.io/qwik-city";
import { UPLOADS_DIR, diskFileName, insertFile } from "~/lib/db";

export const onPost: RequestHandler = async (requestEvent) => {
  let data: unknown;
  try {
    data = await requestEvent.parseBody();
  } catch {
    requestEvent.json(400, { error: "Invalid form data" });
    return;
  }

  const body = data as Record<string, unknown> | undefined;
  const file = body?.file;
  const tag = body?.tag;

  const isFile =
    !!file &&
    typeof file === "object" &&
    typeof (file as File).arrayBuffer === "function" &&
    typeof (file as File).name === "string";

  if (!isFile) {
    requestEvent.json(400, { error: "Missing or invalid 'file' field" });
    return;
  }

  if (typeof tag !== "string" || tag.trim() === "") {
    requestEvent.json(400, { error: "Missing or invalid 'tag' field" });
    return;
  }

  const uploadedFile = file as File;
  const originalName = path.basename(uploadedFile.name || "upload");

  if (!originalName) {
    requestEvent.json(400, { error: "Missing or invalid file name" });
    return;
  }

  const size = uploadedFile.size;
  const mime = uploadedFile.type || "application/octet-stream";

  const record = insertFile(originalName, size, mime, tag);

  try {
    const arrayBuffer = await uploadedFile.arrayBuffer();
    const destination = path.join(
      UPLOADS_DIR,
      diskFileName(record.id, record.name),
    );
    fs.writeFileSync(destination, Buffer.from(arrayBuffer));
  } catch {
    requestEvent.json(400, { error: "Failed to save uploaded file" });
    return;
  }

  requestEvent.json(201, record);
};
