import { type RequestHandler } from "@builder.io/qwik-city";
import { addTask } from "../../../db";

export const onPost: RequestHandler = async (requestEvent) => {
  try {
    let title: string | undefined;

    const body = (await requestEvent.parseBody()) as any;
    if (body && typeof body === "object") {
      title = body.title;
    }

    if (!title) {
      try {
        const clone = requestEvent.request.clone();
        const json = await clone.json();
        title = json?.title;
      } catch {
        // ignore
      }
    }

    if (!title) {
      requestEvent.json(400, { error: "Title is required" });
      return;
    }

    const newTask = addTask(title);
    requestEvent.json(201, newTask);
  } catch (err: any) {
    requestEvent.json(500, { error: err.message });
  }
};
