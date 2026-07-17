import { component$, useStore, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
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
  useVisibleTask$(({ cleanup }) => {
    const eventSource = new EventSource("/api/messages");

    eventSource.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Avoid duplicate messages
        if (!state.messages.some((m) => m.id === msg.id)) {
          state.messages.push(msg);
        }
      } catch (err) {
        console.error("Error parsing SSE message:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource error:", err);
    };

    cleanup(() => {
      eventSource.close();
    });
  });

  const handleSubmit = $(async () => {
    const user = userInput.value.trim();
    const text = textInput.value.trim();
    if (!user || !text) return;

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
        console.error("Failed to send message");
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
          borderRadius: "8px", 
          height: "400px", 
          overflowY: "scroll", 
          padding: "15px", 
          marginBottom: "20px",
          background: "#f9f9f9"
        }}
      >
        {state.messages.length === 0 ? (
          <div style={{ color: "#888", textAlign: "center", marginTop: "180px" }}>No messages yet. Start the conversation!</div>
        ) : (
          state.messages.map((msg) => (
            <div 
              key={msg.id} 
              class="message-item" 
              data-testid="message-item"
              style={{
                padding: "8px 12px",
                margin: "8px 0",
                borderRadius: "6px",
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                wordBreak: "break-word"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontWeight: "bold", color: "#0070f3" }}>{msg.user}</span>
                <span style={{ fontSize: "0.8rem", color: "#999" }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ color: "#333" }}>{msg.text}</div>
            </div>
          ))
        )}
      </div>

      <form preventdefault:submit onSubmit$={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            id="user-input"
            data-testid="user-input"
            type="text"
            placeholder="Your Name"
            value={userInput.value}
            onInput$={(e) => (userInput.value = (e.target as HTMLInputElement).value)}
            style={{ 
              flex: "1", 
              padding: "10px", 
              borderRadius: "4px", 
              border: "1px solid #ccc",
              fontSize: "1rem"
            }}
            required
          />
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            id="text-input"
            data-testid="text-input"
            type="text"
            placeholder="Type your message..."
            value={textInput.value}
            onInput$={(e) => (textInput.value = (e.target as HTMLInputElement).value)}
            style={{ 
              flex: "4", 
              padding: "10px", 
              borderRadius: "4px", 
              border: "1px solid #ccc",
              fontSize: "1rem"
            }}
            required
          />
          <button
            id="send-button"
            data-testid="send-button"
            type="submit"
            style={{ 
              flex: "1", 
              background: "#0070f3", 
              color: "#fff", 
              border: "none", 
              borderRadius: "4px", 
              padding: "10px", 
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "bold"
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
  title: "Qwik SSE Chat",
  meta: [
    {
      name: "description",
      content: "Real-time chat using Server-Sent Events in Qwik City",
    },
  ],
};
