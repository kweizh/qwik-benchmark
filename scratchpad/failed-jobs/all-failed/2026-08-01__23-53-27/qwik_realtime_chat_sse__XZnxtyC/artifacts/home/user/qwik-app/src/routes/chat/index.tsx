import { component$, useStore, $, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

interface ChatMessage {
  id: number;
  user: string;
  text: string;
  timestamp: string;
}

interface ChatStore {
  messages: ChatMessage[];
  user: string;
  text: string;
}

export default component$(() => {
  const state = useStore<ChatStore>({
    messages: [],
    user: "",
    text: "",
  });

  // Client-side execution primitive to connect to the SSE stream
  useVisibleTask$(() => {
    const eventSource = new EventSource("/api/messages");

    eventSource.onmessage = (event) => {
      try {
        const msg: ChatMessage = JSON.parse(event.data);
        // Deduplicate messages in case of reconnects
        if (!state.messages.some((m) => m.id === msg.id)) {
          state.messages = [...state.messages, msg];
        }
      } catch (err) {
        console.error("Failed to parse SSE message:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error, retrying...", err);
    };

    return () => {
      eventSource.close();
    };
  });

  const handleSubmit = $(async (e: Event) => {
    e.preventDefault();
    if (!state.user.trim() || !state.text.trim()) {
      return;
    }

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: state.user,
          text: state.text,
        }),
      });

      if (res.ok) {
        // Clear input fields after successful submission
        state.user = "";
        state.text = "";
      } else {
        console.error("Failed to send message:", await res.text());
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  });

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#333" }}>Qwik SSE Chat Room</h1>
      
      <div 
        id="message-list" 
        data-testid="message-list" 
        style={{
          border: "1px solid #ccc",
          borderRadius: "4px",
          height: "400px",
          overflowY: "scroll",
          padding: "15px",
          marginBottom: "20px",
          backgroundColor: "#f9f9f9"
        }}
      >
        {state.messages.length === 0 ? (
          <div style={{ color: "#777", textAlign: "center", marginTop: "180px" }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          state.messages.map((msg) => (
            <div 
              key={msg.id} 
              class="message-item" 
              data-testid="message-item" 
              style={{
                marginBottom: "12px",
                padding: "8px 12px",
                borderRadius: "4px",
                backgroundColor: "#fff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <strong style={{ color: "#0070f3" }}>{msg.user}</strong>
                <small style={{ color: "#999" }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </small>
              </div>
              <div style={{ color: "#333", wordBreak: "break-word" }}>{msg.text}</div>
            </div>
          ))
        )}
      </div>

      <form onSubmit$={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input
          type="text"
          id="user-input"
          data-testid="user-input"
          placeholder="Your Username"
          value={state.user}
          onInput$={(e) => (state.user = (e.target as HTMLInputElement).value)}
          required
          style={{
            padding: "10px",
            fontSize: "16px",
            borderRadius: "4px",
            border: "1px solid #ccc"
          }}
        />
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            id="text-input"
            data-testid="text-input"
            placeholder="Type a message..."
            value={state.text}
            onInput$={(e) => (state.text = (e.target as HTMLInputElement).value)}
            required
            style={{
              flexGrow: 1,
              padding: "10px",
              fontSize: "16px",
              borderRadius: "4px",
              border: "1px solid #ccc"
            }}
          />
          <button
            type="submit"
            id="send-button"
            data-testid="send-button"
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              backgroundColor: "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Qwik SSE Chat Room",
  meta: [
    {
      name: "description",
      content: "Real-time collaborative chat room using Server-Sent Events",
    },
  ],
};
