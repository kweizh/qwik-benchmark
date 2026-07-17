import { type RequestHandler } from "@builder.io/qwik-city";
import db from "../../../db";

export const onGet: RequestHandler = async (event) => {
  try {
    const files = db.prepare("SELECT * FROM files").all();
    event.json(200, files);
  } catch (error: any) {
    event.json(500, {
      error: error.message || "An error occurred while listing files",
    });
  }
};
