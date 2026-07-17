import { component$, useStore, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

interface Message {
  id: number;
  user: string;
  text: string;
  timestamp: string;
}

interface ChatStore {
  messages: Message[];
  user: string;
  text: string;
}

export default component$(() => {
  const state = useStore<ChatStore>({
    messages: [],
    user: '',
    text: '',
  });

  // Connect to the SSE stream on the client side
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const eventSource = new EventSource('/api/messages');

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as Message;
        // Avoid duplicate messages
        const exists = state.messages.some((m) => m.id === message.id);
        if (!exists) {
          state.messages.push(message);
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource error:', err);
    };

    cleanup(() => {
      eventSource.close();
    });
  });

  const handleSubmit = $(async () => {
    if (!state.user.trim() || !state.text.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: state.user,
          text: state.text,
        }),
      });

      if (response.ok) {
        // Clear inputs after successful submission
        state.user = '';
        state.text = '';
      } else {
        console.error('Failed to post message:', response.statusText);
      }
    } catch (err) {
      console.error('Error posting message:', err);
    }
  });

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>SSE Real-Time Chat</h1>

      <form onSubmit$={handleSubmit} preventdefault:submit style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          id="user-input"
          data-testid="user-input"
          value={state.user}
          onInput$={(e) => (state.user = (e.target as HTMLInputElement).value)}
          placeholder="Your name"
          style={{ padding: '8px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          type="text"
          id="text-input"
          data-testid="text-input"
          value={state.text}
          onInput$={(e) => (state.text = (e.target as HTMLInputElement).value)}
          placeholder="Type a message..."
          style={{ padding: '8px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button
          type="submit"
          id="send-button"
          data-testid="send-button"
          style={{ padding: '10px', fontSize: '16px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Send
        </button>
      </form>

      <div
        id="message-list"
        data-testid="message-list"
        style={{ border: '1px solid #eee', borderRadius: '4px', padding: '10px', maxHeight: '400px', overflowY: 'auto', backgroundColor: '#f9f9f9' }}
      >
        {state.messages.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' }}>No messages yet. Say hello!</p>
        ) : (
          state.messages.map((msg) => (
            <div
              key={msg.id}
              class="message-item"
              data-testid="message-item"
              style={{ padding: '8px', borderBottom: '1px solid #eee', marginBottom: '4px' }}
            >
              <strong style={{ color: '#0070f3' }}>{msg.user}</strong>:{' '}
              <span>{msg.text}</span>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                {new Date(msg.timestamp).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Qwik Real-Time SSE Chat',
};
