import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  // Reactive state holding the current document text shown in the textarea.
  const text = useSignal("");
  // A stable, unique id for this browser tab. Used to ignore our own edits
  // when they are echoed back over the SSE stream.
  const clientId = useSignal("");

  // All browser-only APIs (EventSource) belong inside useVisibleTask$.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    // Generate a unique id for this tab.
    clientId.value =
      Math.random().toString(36).slice(2) + Date.now().toString(36);

    const eventSource = new EventSource("/api/notepad");

    // On connect the server sends the latest document text as a snapshot.
    eventSource.addEventListener("snapshot", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as {
        text: string;
      };
      text.value = data.text;
    });

    // Every broadcast edit arrives as an update. Ignore edits that originated
    // from this same tab so we don't clobber in-progress typing.
    eventSource.addEventListener("update", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as {
        text: string;
        clientId: string;
      };
      if (data.clientId === clientId.value) {
        return;
      }
      text.value = data.text;
    });

    // Close the connection when the task is cleaned up (e.g. on navigation).
    return () => {
      eventSource.close();
    };
  });

  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "2rem auto",
        padding: "0 1rem",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      }}
    >
      <h1>Collaborative Notepad</h1>
      <p style={{ color: "#666" }}>
        Open this page in another browser tab to edit together in real time.
      </p>
      <textarea
        value={text.value}
        onInput$={async (event) => {
          const value = (event.target as HTMLTextAreaElement).value;
          // Optimistically update local state so typing feels instant.
          text.value = value;
          // Broadcast the new text to all other connected clients.
          await fetch("/api/notepad", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: value, clientId: clientId.value }),
          });
        }}
        rows={20}
        placeholder="Start typing..."
        style={{
          width: "100%",
          fontSize: "1rem",
          padding: "0.75rem",
          borderRadius: "8px",
          border: "1px solid #ccc",
          boxSizing: "border-box",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          resize: "vertical",
        }}
      />
    </main>
  );
});

export const head: DocumentHead = {
  title: "Collaborative Notepad",
  meta: [
    {
      name: "description",
      content: "Real-time collaborative notepad built with Qwik City and SSE",
    },
  ],
};