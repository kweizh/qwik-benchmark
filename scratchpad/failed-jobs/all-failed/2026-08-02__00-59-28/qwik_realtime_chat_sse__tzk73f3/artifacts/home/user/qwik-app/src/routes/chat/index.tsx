import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

interface Message {
  id: number;
  user: string;
  text: string;
  timestamp: string;
}

export default component$(() => {
  const messages = useSignal<Message[]>([]);
  const userInput = useSignal("");
  const textInput = useSignal("");
  const error = useSignal("");

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const eventSource = new EventSource("/api/messages");

    eventSource.onmessage = (event) => {
      try {
        const msg: Message = JSON.parse(event.data);
        messages.value = [...messages.value, msg];
      } catch {
        // ignore malformed messages
      }
    };

    eventSource.onerror = () => {
      // SSE connection error - browser will auto-reconnect
    };

    return () => {
      eventSource.close();
    };
  });

  const handleSubmit = $(async () => {
    const user = userInput.value.trim();
    const text = textInput.value.trim();

    if (!user || !text) {
      error.value = "Both user and text are required.";
      return;
    }

    error.value = "";

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, text }),
      });

      if (!res.ok) {
        error.value = "Failed to send message.";
        return;
      }

      // Clear inputs on success
      userInput.value = "";
      textInput.value = "";
    } catch {
      error.value = "Network error. Please try again.";
    }
  });

  return (
    <div>
      <h1>Chat Room</h1>

      <div>
        <input
          id="user-input"
          data-testid="user-input"
          type="text"
          placeholder="Your name"
          value={userInput.value}
          onInput$={(e) => {
            userInput.value = (e.target as HTMLInputElement).value;
          }}
        />
        <input
          id="text-input"
          data-testid="text-input"
          type="text"
          placeholder="Type a message..."
          value={textInput.value}
          onInput$={(e) => {
            textInput.value = (e.target as HTMLInputElement).value;
          }}
          onKeyDown$={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
        />
        <button
          id="send-button"
          data-testid="send-button"
          onClick$={handleSubmit}
        >
          Send
        </button>
      </div>

      {error.value && (
        <div style={{ color: "red", margin: "8px 0" }}>{error.value}</div>
      )}

      <div id="message-list" data-testid="message-list">
        {messages.value.map((msg) => (
          <div key={msg.id} class="message-item" data-testid="message-item">
            <strong>{msg.user}</strong>: {msg.text}
            <span style={{ color: "#999", fontSize: "0.8em", marginLeft: "8px" }}>
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Chat Room",
};
