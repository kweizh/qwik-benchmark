import fs from "node:fs";
import path from "node:path";
import type { RequestHandler } from "@builder.io/qwik-city";
import { UPLOADS_DIR, deleteFileRecord, diskFileName, getFileById } from "~/lib/db";

export const onDelete: RequestHandler = async (requestEvent) => {
  const idParam = requestEvent.params.id;
  const id = Number(idParam);

  if (!Number.isInteger(id)) {
    requestEvent.json(400, { error: "Invalid file id" });
    return;
  }

  const record = getFileById(id);

  if (!record) {
    requestEvent.json(404, { error: `File with id ${id} not found` });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, diskFileName(record.id, record.name));

  try {
    fs.unlinkSync(filePath);
  } catch {
    // If the file is already missing from disk, we still proceed to
    // remove the metadata record and report success below.
  }

  deleteFileRecord(id);

  requestEvent.json(200, { success: true });
};
