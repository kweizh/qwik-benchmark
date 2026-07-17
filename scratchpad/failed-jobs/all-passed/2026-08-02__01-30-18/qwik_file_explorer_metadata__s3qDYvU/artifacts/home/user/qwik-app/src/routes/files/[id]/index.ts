import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "../../../lib/db";
import { unlinkSync, existsSync } from "fs";
import { join } from "path";

interface FileRecord {
  id: number;
  name: string;
  size: number;
  mime: string;
  tag: string;
}

export const onDelete: RequestHandler = async (ev) => {
  try {
    const id = parseInt(ev.params.id, 10);
    if (isNaN(id)) {
      ev.json(400, { error: "Invalid ID format" });
      return;
    }

    const stmtSelect = db.prepare("SELECT id, name, size, mime, tag FROM files WHERE id = ?");
    const file = stmtSelect.get(id) as FileRecord | undefined;

    if (!file) {
      ev.json(404, { error: `File with ID ${id} not found` });
      return;
    }

    const filePath = join("/home/user/qwik-app/public/uploads", file.name);
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch (err) {
        // Proceed anyway as per requirements
      }
    }

    const stmtDelete = db.prepare("DELETE FROM files WHERE id = ?");
    stmtDelete.run(id);

    ev.json(200, { success: true });
  } catch (error: any) {
    ev.json(500, { error: error.message || "An error occurred during deletion" });
  }
};
