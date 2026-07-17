import type { RequestHandler } from "@builder.io/qwik-city";
import { notepadHub, type NotepadEdit } from "~/lib/notepad-hub";

const encoder = new TextEncoder();

function formatEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// GET /api/notepad — opens a long-lived SSE stream.
export const onGet: RequestHandler = async (requestEvent) => {
  requestEvent.headers.set("Content-Type", "text/event-stream");
  requestEvent.headers.set("Cache-Control", "no-cache, no-transform");
  requestEvent.headers.set("Connection", "keep-alive");

  const writableStream = requestEvent.getWritableStream();
  const writer = writableStream.getWriter();

  // Send the current document text immediately as the first event.
  await writer.write(formatEvent("snapshot", { text: notepadHub.getText() }));

  // Forward every subsequent edit to this client.
  const unsubscribe = notepadHub.subscribe((edit: NotepadEdit) => {
    writer.write(formatEvent("update", edit)).catch(() => {
      // Writing can fail if the client already disconnected; cleanup is
      // handled by the abort listener below.
    });
  });

  const cleanup = () => {
    unsubscribe();
    writer.close().catch(() => {
      // Stream may already be closed.
    });
  };

  // Ensure we unsubscribe and release the writer when the client disconnects.
  requestEvent.signal.addEventListener("abort", cleanup);
};

// POST /api/notepad — accepts an edit, updates the stored document text,
// and broadcasts it to every connected SSE client.
export const onPost: RequestHandler = async (requestEvent) => {
  const body = (await requestEvent.request.json()) as Partial<NotepadEdit>;

  const text = typeof body?.text === "string" ? body.text : "";
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";

  notepadHub.publish({ text, clientId });

  requestEvent.json(200, { ok: true });
};
