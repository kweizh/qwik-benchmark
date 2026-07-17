import {
  $,
  component$,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  // Reactive state holding the current document text shown in the textarea.
  const text = useSignal("");

  // Unique id assigned to this tab on first mount; used to ignore echoes of
  // our own broadcasts so they don't clobber the text the user is typing.
  const clientId = useSignal("");

  useVisibleTask$(({ cleanup }) => {
    // Generate a per-tab id. crypto.randomUUID is available in all modern
    // browsers; fall back to a Math.random-based id just in case.
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    clientId.value = id;

    const es = new EventSource("/api/notepad");

    es.addEventListener("snapshot", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as {
          text?: string;
        };
        if (typeof data.text === "string") {
          text.value = data.text;
        }
      } catch {
        // Ignore malformed payloads.
      }
    });

    es.addEventListener("update", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as {
          text?: string;
          clientId?: string;
        };
        // Ignore echoes of our own edits so they don't clobber the text
        // the user is currently typing.
        if (data.clientId && data.clientId === clientId.value) return;
        if (typeof data.text === "string") {
          text.value = data.text;
        }
      } catch {
        // Ignore malformed payloads.
      }
    });

    cleanup(() => {
      es.close();
    });
  });

  const handleInput = $(async (_event: Event, el: HTMLTextAreaElement) => {
    const value = el.value;
    // Update local state immediately so the textarea reflects the keystroke
    // without waiting for the server round-trip.
    text.value = value;

    // Don't try to POST if we haven't received our client id yet.
    if (!clientId.value) return;

    try {
      await fetch("/api/notepad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, clientId: clientId.value }),
      });
    } catch {
      // Network errors are ignored for the demo; the next keystroke will
      // resync via a new POST.
    }
  });

  return (
    <>
      <h1>Collaborative Notepad</h1>
      <p>
        Open this page in multiple tabs to see live updates. Edits you make
        show up in every other tab in real time.
      </p>
      <textarea
        value={text.value}
        onInput$={handleInput}
        rows={20}
        cols={80}
        placeholder="Start typing..."
        style={{
          width: "100%",
          minHeight: "50vh",
          fontFamily: "monospace",
          fontSize: "14px",
          padding: "8px",
          boxSizing: "border-box",
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
      content:
        "Real-time collaborative notepad powered by Qwik City and Server-Sent Events.",
    },
  ],
};
