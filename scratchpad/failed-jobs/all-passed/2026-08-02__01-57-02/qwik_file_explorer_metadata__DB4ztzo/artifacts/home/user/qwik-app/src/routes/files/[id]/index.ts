import { type RequestHandler } from "@builder.io/qwik-city";
import fs from "fs";
import path from "path";
import db from "../../../db";

export const onDelete: RequestHandler = async (event) => {
  try {
    const { id } = event.params;
    const fileId = parseInt(id, 10);
    if (isNaN(fileId)) {
      event.json(400, { error: "Invalid file ID" });
      return;
    }

    // Fetch the file metadata first
    const file = db.prepare("SELECT * FROM files WHERE id = ?").get(fileId) as any;
    if (!file) {
      event.json(404, { error: "File not found" });
      return;
    }

    // Delete the physical file from disk if it exists
    const uploadsDir = "/home/user/qwik-app/public/uploads";
    const filePath = path.join(uploadsDir, file.name);

    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch {
      // Ignore disk deletion error if file is missing
    }

    // Delete from database
    db.prepare("DELETE FROM files WHERE id = ?").run(fileId);

    event.json(200, { success: true });
  } catch (error: any) {
    event.json(500, {
      error: error.message || "An error occurred during deletion",
    });
  }
};
