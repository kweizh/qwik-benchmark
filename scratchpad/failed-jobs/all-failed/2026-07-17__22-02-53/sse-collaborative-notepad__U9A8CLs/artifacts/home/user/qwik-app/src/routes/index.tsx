import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  const text = useSignal("");
  const clientId = useSignal("");
  const status = useSignal("Connecting...");

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    // Generate unique client ID on the client side
    clientId.value = Math.random().toString(36).substring(2, 15);

    const eventSource = new EventSource("/api/notepad");

    eventSource.addEventListener("open", () => {
      status.value = "Connected";
    });

    eventSource.addEventListener("error", () => {
      status.value = "Disconnected / Reconnecting...";
    });

    eventSource.addEventListener("snapshot", (event) => {
      try {
        const data = JSON.parse(event.data);
        text.value = data.text;
      } catch (err) {
        console.error("Error parsing snapshot event:", err);
      }
    });

    eventSource.addEventListener("update", (event) => {
      try {
        const data = JSON.parse(event.data);
        // Ignore our own broadcasts
        if (data.clientId !== clientId.value) {
          text.value = data.text;
        }
      } catch (err) {
        console.error("Error parsing update event:", err);
      }
    });

    cleanup(() => {
      eventSource.close();
    });
  });

  return (
    <div style={{
      maxWidth: "800px",
      margin: "0 auto",
      padding: "2rem",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"
    }}>
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.5rem",
        borderBottom: "1px solid #e2e8f0",
        paddingBottom: "1rem"
      }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "bold", color: "#1a202c" }}>
          Collaborative Notepad 📝
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: status.value === "Connected" ? "#38a169" : "#e53e3e",
              display: "inline-block"
            }}></span>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#4a5568" }}>
              {status.value}
            </span>
          </div>
          {clientId.value && (
            <span style={{ fontSize: "0.75rem", color: "#718096", backgroundColor: "#edf2f7", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>
              Client ID: {clientId.value}
            </span>
          )}
        </div>
      </header>

      <main>
        <textarea
          value={text.value}
          onInput$={(e) => {
            const target = e.target as HTMLTextAreaElement;
            text.value = target.value;
            fetch("/api/notepad", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: target.value,
                clientId: clientId.value,
              }),
            }).catch((err) => {
              console.error("Failed to send update:", err);
            });
          }}
          placeholder="Start typing here... edits will be shared instantly with all connected tabs!"
          style={{
            width: "100%",
            height: "450px",
            padding: "1rem",
            fontSize: "1rem",
            fontFamily: "Fira Code, Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
            border: "1px solid #cbd5e0",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box"
          }}
        />
      </main>

      <footer style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.875rem", color: "#a0aec0" }}>
        Built with Qwik City & Server-Sent Events (SSE)
      </footer>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Real-Time Collaborative Notepad",
  meta: [
    {
      name: "description",
      content: "Collaborative notepad with real-time updates via SSE",
    },
  ],
};
