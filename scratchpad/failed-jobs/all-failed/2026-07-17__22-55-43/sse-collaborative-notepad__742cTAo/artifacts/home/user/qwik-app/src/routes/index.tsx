import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

interface SnapshotPayload {
  text: string;
}

interface UpdatePayload {
  text: string;
  clientId: string;
}

export default component$(() => {
  const text = useSignal("");
  const clientId = useSignal("");

  useVisibleTask$(({ cleanup }) => {
    // Each browser tab gets its own id so it can recognize (and ignore) the
    // echo of its own edits when they come back through the SSE stream.
    clientId.value = crypto.randomUUID();

    const source = new EventSource("/api/notepad");

    source.addEventListener("snapshot", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as SnapshotPayload;
      text.value = payload.text;
    });

    source.addEventListener("update", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as UpdatePayload;
      // Ignore broadcasts that originated from this very client — the
      // textarea already reflects that edit and we don't want to clobber
      // whatever the user has typed since then.
      if (payload.clientId === clientId.value) {
        return;
      }
      text.value = payload.text;
    });

    cleanup(() => {
      source.close();
    });
  });

  return (
    <>
      <h1>Collaborative Notepad</h1>
      <textarea
        style={{ width: "100%", height: "60vh", fontFamily: "monospace", fontSize: "1rem" }}
        value={text.value}
        onInput$={(_, el) => {
          text.value = el.value;
          fetch("/api/notepad", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: el.value, clientId: clientId.value }),
          });
        }}
      />
    </>
  );
});

export const head: DocumentHead = {
  title: "Collaborative Notepad",
  meta: [
    {
      name: "description",
      content: "A real-time collaborative notepad built with Qwik City and SSE.",
    },
  ],
};
