import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  const count = useSignal<number>(0);

  // Establish SSE subscription on the client
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const eventSource = new EventSource('/api/counter/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && typeof data.count === 'number') {
          count.value = data.count;
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
    };

    cleanup(() => {
      eventSource.close();
    });
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#f9fafb',
      color: '#111827'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '2.5rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937' }}>
          Live Shared Counter
        </h1>
        
        <div style={{
          fontSize: '4.5rem',
          fontWeight: '800',
          color: '#2563eb',
          margin: '2rem 0'
        }} id="counter-value">
          {count.value}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick$={async () => {
              try {
                await fetch('/api/counter', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ delta: -1 }),
                });
              } catch (err) {
                console.error('Error mutating counter:', err);
              }
            }}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#ffffff',
              backgroundColor: '#dc2626',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              flex: 1
            }}
          >
            - Decrement
          </button>
          
          <button
            onClick$={async () => {
              try {
                await fetch('/api/counter', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ delta: 1 }),
                });
              } catch (err) {
                console.error('Error mutating counter:', err);
              }
            }}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#ffffff',
              backgroundColor: '#16a34a',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              flex: 1
            }}
          >
            + Increment
          </button>
        </div>
        
        <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
          Open this page in multiple tabs to see real-time synchronization over SSE!
        </p>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Live Shared Counter",
  meta: [
    {
      name: "description",
      content: "Real-time live shared counter over Server-Sent Events with Qwik City",
    },
  ],
};
