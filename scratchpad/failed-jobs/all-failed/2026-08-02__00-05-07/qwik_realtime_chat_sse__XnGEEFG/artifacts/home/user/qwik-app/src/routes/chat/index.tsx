import {
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
  $,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

interface ChatMessage {
  id: number;
  user: string;
  text: string;
  timestamp: string;
}

export default component$(() => {
  const messages = useStore<{ list: ChatMessage[] }>({ list: [] });
  const userInput = useSignal("");
  const textInput = useSignal("");

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const eventSource = new EventSource("/api/messages");

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ChatMessage;
        if (!messages.list.some((m) => m.id === message.id)) {
          messages.list = [...messages.list, message];
        }
      } catch {
        // ignore malformed message
      }
    };

    cleanup(() => {
      eventSource.close();
    });
  });

  const sendMessage = $(async () => {
    const user = userInput.value.trim();
    const text = textInput.value.trim();
    if (!user || !text) {
      return;
    }

    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, text }),
    });

    if (response.ok) {
      textInput.value = "";
    }
  });

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "1rem" }}>
      <h1>Chat Room</h1>

      <ul
        id="message-list"
        data-testid="message-list"
        style={{
          listStyle: "none",
          padding: "0.5rem",
          margin: "1rem 0",
          border: "1px solid #ccc",
          borderRadius: "4px",
          minHeight: "200px",
          maxHeight: "400px",
          overflowY: "auto",
        }}
      >
        {messages.list.map((message) => (
          <li
            key={message.id}
            class="message-item"
            data-testid="message-item"
            style={{ marginBottom: "0.5rem" }}
          >
            <strong>{message.user}:</strong> {message.text}{" "}
            <small style={{ color: "#888" }}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </small>
          </li>
        ))}
      </ul>

      <form
        preventdefault:submit
        onSubmit$={sendMessage}
        style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
      >
        <input
          id="user-input"
          data-testid="user-input"
          type="text"
          placeholder="Your name"
          value={userInput.value}
          onInput$={(_, el) => (userInput.value = el.value)}
        />
        <input
          id="text-input"
          data-testid="text-input"
          type="text"
          placeholder="Message"
          value={textInput.value}
          onInput$={(_, el) => (textInput.value = el.value)}
        />
        <button id="send-button" data-testid="send-button" type="submit">
          Send
        </button>
      </form>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Chat Room",
  meta: [
    {
      name: "description",
      content: "Real-time chat room using Server-Sent Events",
    },
  ],
};
