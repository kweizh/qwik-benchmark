import {
  component$,
  useStore,
  useSignal,
  useVisibleTask$,
  $,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

interface Message {
  id: number;
  user: string;
  text: string;
  timestamp: string;
}

export default component$(() => {
  const state = useStore<{ messages: Message[] }>({ messages: [] });
  const userInput = useSignal("");
  const textInput = useSignal("");

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const eventSource = new EventSource("/api/messages");

    eventSource.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!state.messages.some((m) => m.id === msg.id)) {
          state.messages.push(msg);
          // Scroll to bottom on new message
          setTimeout(() => {
            const listEl = document.getElementById("message-list");
            if (listEl) {
              listEl.scrollTop = listEl.scrollHeight;
            }
          }, 50);
        }
      } catch (err) {
        console.error("Error parsing message:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource error:", err);
    };

    return () => {
      eventSource.close();
    };
  });

  const sendMessage = $(async () => {
    const user = userInput.value.trim();
    const text = textInput.value.trim();

    if (!user || !text) {
      return;
    }

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user, text }),
      });

      if (res.ok) {
        userInput.value = "";
        textInput.value = "";
      } else {
        console.error("Failed to send message:", res.statusText);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  });

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
        padding: "20px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center", color: "#333", marginBottom: "20px" }}>
        Qwik City Real-Time Chat
      </h2>
      <div
        id="message-list"
        data-testid="message-list"
        style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          height: "400px",
          overflowY: "auto",
          padding: "15px",
          marginBottom: "20px",
          backgroundColor: "#fafafa",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {state.messages.map((msg) => (
          <div
            key={msg.id}
            class="message-item"
            data-testid="message-item"
            style={{
              padding: "10px",
              borderRadius: "6px",
              backgroundColor: "#fff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              border: "1px solid #eaeaea",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <strong style={{ color: "#0070f3" }}>{msg.user}</strong>
              <span style={{ fontSize: "0.75em", color: "#999" }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div style={{ color: "#444", wordBreak: "break-word" }}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <form
        preventDefault:submit
        onSubmit$={sendMessage}
        style={{ display: "flex", flexDirection: "column", gap: "15px" }}
      >
        <div>
          <label
            for="user-input"
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "600",
              color: "#555",
            }}
          >
            Username
          </label>
          <input
            id="user-input"
            data-testid="user-input"
            type="text"
            bind:value={userInput}
            placeholder="Enter your username"
            required
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div>
          <label
            for="text-input"
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "600",
              color: "#555",
            }}
          >
            Message
          </label>
          <input
            id="text-input"
            data-testid="text-input"
            type="text"
            bind:value={textInput}
            placeholder="Type your message..."
            required
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
        </div>
        <button
          id="send-button"
          data-testid="send-button"
          type="submit"
          style={{
            padding: "12px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#0070f3",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1rem",
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Qwik Chat Room",
  meta: [
    {
      name: "description",
      content: "Real-time chat room powered by Qwik City and SSE",
    },
  ],
};
