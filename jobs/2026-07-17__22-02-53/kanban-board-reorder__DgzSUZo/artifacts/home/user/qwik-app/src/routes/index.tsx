import { component$, useStore, useTask$, $ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { getBoard } from '../lib/db';

export const useBoardLoader = routeLoader$(() => {
  return getBoard();
});

export default component$(() => {
  const boardLoader = useBoardLoader();

  const state = useStore({
    todo: boardLoader.value.todo,
    doing: boardLoader.value.doing,
    done: boardLoader.value.done,
    draggingCardId: null as number | null,
  }, { deep: true });

  // Keep store in sync if loader value changes on navigation/reload
  useTask$(({ track }) => {
    const board = track(() => boardLoader.value);
    state.todo = board.todo;
    state.doing = board.doing;
    state.done = board.done;
  });

  const handleMove = $(async (cardId: number, toColumn: 'todo' | 'doing' | 'done', toIndex: number) => {
    // 1. Optimistic UI update
    let foundCard: any = null;
    let fromColumn: 'todo' | 'doing' | 'done' | null = null;

    for (const col of ['todo', 'doing', 'done'] as const) {
      const idx = state[col].findIndex((c: any) => c.id === cardId);
      if (idx !== -1) {
        foundCard = state[col][idx];
        fromColumn = col;
        state[col].splice(idx, 1);
        break;
      }
    }

    if (!foundCard || !fromColumn) return;

    // Insert into target column
    const targetColCards = state[toColumn];
    const clampedIndex = Math.max(0, Math.min(toIndex, targetColCards.length));
    targetColCards.splice(clampedIndex, 0, foundCard);

    // Re-number positions
    for (const col of ['todo', 'doing', 'done'] as const) {
      state[col].forEach((c: any, idx: number) => {
        c.position = idx;
      });
    }

    // 2. Persist to server
    try {
      const res = await fetch('/api/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cardId, toColumn, toIndex }),
      });

      if (res.ok) {
        const updatedBoard = await res.json();
        state.todo = updatedBoard.todo;
        state.doing = updatedBoard.doing;
        state.done = updatedBoard.done;
      } else {
        console.error('Failed to persist move', await res.text());
      }
    } catch (err) {
      console.error('Error persisting move', err);
    }
  });

  const handleReset = $(async () => {
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
      });
      if (res.ok) {
        const updatedBoard = await res.json();
        state.todo = updatedBoard.todo;
        state.doing = updatedBoard.doing;
        state.done = updatedBoard.done;
      }
    } catch (err) {
      console.error('Error resetting board', err);
    }
  });

  return (
    <div class="app-container">
      <header>
        <h1>Kanban Board</h1>
        <button class="reset-btn" onClick$={handleReset}>
          Reset Board
        </button>
      </header>

      <div class="board">
        {(['todo', 'doing', 'done'] as const).map((colName) => {
          const colCards = state[colName] || [];
          return (
            <div
              key={colName}
              data-column={colName}
              class="column"
              preventdefault:dragover
              preventdefault:drop
              onDragOver$={() => {}}
              onDrop$={() => {
                if (state.draggingCardId !== null) {
                  handleMove(state.draggingCardId, colName, colCards.length);
                }
                state.draggingCardId = null;
              }}
            >
              <div class="column-header">
                <h2 class="column-title">{colName}</h2>
                <span class="card-count">{colCards.length}</span>
              </div>
              <div class="cards-container">
                {colCards.map((card) => (
                  <div
                    key={card.id}
                    data-card-id={card.id}
                    draggable={true}
                    onDragStart$={() => {
                      state.draggingCardId = card.id;
                    }}
                    preventdefault:dragover
                    preventdefault:drop
                    stoppropagation:drop
                    onDragOver$={() => {}}
                    onDrop$={() => {
                      if (state.draggingCardId !== null && state.draggingCardId !== card.id) {
                        handleMove(state.draggingCardId, colName, card.position);
                      }
                      state.draggingCardId = null;
                    }}
                    class="card"
                  >
                    <div class="card-id">#{card.id}</div>
                    <div class="card-title">{card.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Qwik Kanban Board",
  meta: [
    {
      name: "description",
      content: "A native drag-and-drop Kanban Board built with Qwik City and SQLite",
    },
  ],
};
