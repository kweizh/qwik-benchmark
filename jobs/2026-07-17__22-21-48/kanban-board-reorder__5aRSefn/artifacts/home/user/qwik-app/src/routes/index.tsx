import { component$, useStore, $ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import type { BoardDTO, CardDTO, Column } from "~/types";
import { applyMoveToBoard, COLUMNS } from "~/lib/board";
import { getBoard } from "~/db/board";

// Server-only: loads the board from SQLite during SSR so the initial HTML is
// rendered with the persisted order. The data is serialized and rehydrated.
export const useBoard = routeLoader$(async () => {
  return getBoard();
});

interface DragState {
  cardId: number | null;
  fromColumn: Column | null;
  overColumn: Column | null;
  overCardId: number | null;
  overHalf: "top" | "bottom" | null;
}

/**
 * Compute the insertion index (in the column *excluding* the dragged card)
 * that should be sent to the server, based on the current drag-over target.
 */
function computeToIndex(
  board: BoardDTO,
  drag: DragState,
  toColumn: Column,
): number {
  const colCards = board[toColumn].filter((c) => c.id !== drag.cardId);
  if (
    drag.overCardId != null &&
    drag.overColumn === toColumn &&
    colCards.some((c) => c.id === drag.overCardId)
  ) {
    const idx = colCards.findIndex((c) => c.id === drag.overCardId);
    return drag.overHalf === "bottom" ? idx + 1 : idx;
  }
  return colCards.length; // append at end
}

/**
 * Map a reduced-list insertion index to a full-list index for rendering the
 * drop indicator line.
 */
function visualIndicatorIndex(
  fullList: CardDTO[],
  draggedId: number | null,
  reducedIndex: number,
): number {
  if (draggedId == null) return -1;
  let count = 0;
  for (let i = 0; i < fullList.length; i++) {
    if (fullList[i].id === draggedId) continue;
    if (count === reducedIndex) return i;
    count++;
  }
  return fullList.length;
}

export default component$(() => {
  const boardSignal = useBoard();
  const store = useStore<BoardDTO>(
    {
      todo: boardSignal.value.todo.map((c) => ({ ...c })),
      doing: boardSignal.value.doing.map((c) => ({ ...c })),
      done: boardSignal.value.done.map((c) => ({ ...c })),
    },
    { deep: true },
  );

  const drag = useStore<DragState>({
    cardId: null,
    fromColumn: null,
    overColumn: null,
    overCardId: null,
    overHalf: null,
  });

  const resetDrag = $(() => {
    drag.cardId = null;
    drag.fromColumn = null;
    drag.overColumn = null;
    drag.overCardId = null;
    drag.overHalf = null;
  });

  const persistMove = $(
    async (cardId: number, toColumn: Column, toIndex: number) => {
      try {
        const res = await fetch("/api/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId, toColumn, toIndex }),
        });
        if (res.ok) {
          const next: BoardDTO = await res.json();
          store.todo = next.todo;
          store.doing = next.doing;
          store.done = next.done;
        }
      } catch {
        // network error: keep optimistic state
      }
    },
  );

  const handleDrop = $((toColumn: Column) => {
    const cardId = drag.cardId;
    if (cardId == null) return;
    const toIndex = computeToIndex(store, drag, toColumn);
    // Optimistic local update for snappy feedback.
    try {
      const next = applyMoveToBoard(store, cardId, toColumn, toIndex);
      store.todo = next.todo;
      store.doing = next.doing;
      store.done = next.done;
    } catch {
      // ignore; server is authoritative
    }
    void persistMove(cardId, toColumn, toIndex);
    void resetDrag();
  });

  const resetBoard = $(async () => {
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (res.ok) {
        const next: BoardDTO = await res.json();
        store.todo = next.todo;
        store.doing = next.doing;
        store.done = next.done;
      }
    } catch {
      // ignore
    }
  });

  return (
    <main class="board-page">
      <header class="board-header">
        <h1>Kanban Board</h1>
        <button class="reset-btn" onClick$={resetBoard}>
          Reset board
        </button>
      </header>

      <div class="board">
        {COLUMNS.map((col) => {
          const cards = store[col];
          const isDraggingHere =
            drag.cardId != null && drag.overColumn === col;
          const reducedIndex = isDraggingHere
            ? computeToIndex(store, drag, col)
            : -1;
          const indicatorAt = isDraggingHere
            ? visualIndicatorIndex(cards, drag.cardId, reducedIndex)
            : -1;

          return (
            <section
              class="column"
              data-column={col}
              onDragOver$={(e) => {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                // Only treat as a column-level (append) drop when the pointer
                // is over the column itself, not over a card.
                if (e.target === e.currentTarget) {
                  drag.overColumn = col;
                  drag.overCardId = null;
                  drag.overHalf = null;
                }
              }}
              onDrop$={(e) => {
                e.preventDefault();
                handleDrop(col);
              }}
            >
              <h2 class="column-title">{col.toUpperCase()}</h2>
              <div class="cards">
                {cards.map((card, i) => (
                  <>
                    {indicatorAt === i && <div class="drop-indicator" />}
                    <div
                      class="card"
                      data-card-id={card.id}
                      draggable={true}
                      data-dragging={drag.cardId === card.id ? "true" : undefined}
                      onDragStart$={(e) => {
                        drag.cardId = card.id;
                        drag.fromColumn = col;
                        if (e.dataTransfer) {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", String(card.id));
                        }
                      }}
                      onDragOver$={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                        const rect = (
                          e.currentTarget as HTMLElement
                        ).getBoundingClientRect();
                        const offset = e.clientY - rect.top;
                        const half =
                          offset < rect.height / 2 ? "top" : "bottom";
                        drag.overColumn = col;
                        drag.overCardId = card.id;
                        drag.overHalf = half;
                      }}
                      onDragEnd$={resetDrag}
                    >
                      <span class="card-title">{card.title}</span>
                    </div>
                  </>
                ))}
                {indicatorAt === cards.length && (
                  <div class="drop-indicator" />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Kanban Board",
  meta: [{ name: "description", content: "Qwik City Kanban board" }],
};