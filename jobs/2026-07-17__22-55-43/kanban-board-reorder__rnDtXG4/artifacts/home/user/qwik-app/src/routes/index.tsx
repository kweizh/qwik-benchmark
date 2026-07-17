import { $, component$, useStore } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";
import { getBoard, type Board, type ColumnName } from "~/lib/db";

export const useBoardLoader = routeLoader$<Board>(() => {
  return getBoard();
});

interface DragState {
  draggingId: number | null;
}

const COLUMN_LABELS: Record<ColumnName, string> = {
  todo: "To Do",
  doing: "Doing",
  done: "Done",
};

const COLUMN_ORDER: ColumnName[] = ["todo", "doing", "done"];

export default component$(() => {
  const boardLoader = useBoardLoader();
  const board = useStore<Board>(
    {
      todo: boardLoader.value.todo,
      doing: boardLoader.value.doing,
      done: boardLoader.value.done,
    },
    { deep: true },
  );

  const drag = useStore<DragState>({ draggingId: null });

  const applyMove = $(
    async (cardId: number, toColumn: ColumnName, toIndex: number) => {
      const res = await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, toColumn, toIndex }),
      });
      if (res.ok) {
        const updated: Board = await res.json();
        board.todo = updated.todo;
        board.doing = updated.doing;
        board.done = updated.done;
      }
    },
  );

  return (
    <div class="board">
      <h1>Kanban Board</h1>
      <div class="columns">
        {COLUMN_ORDER.map((col) => (
          <div
            key={col}
            class="column"
            data-column={col}
            onDragOver$={(e) => {
              e.preventDefault();
            }}
            onDrop$={(e) => {
              e.preventDefault();
              if (drag.draggingId == null) return;
              const target = e.target as HTMLElement;
              const columnEl = (target.closest(
                "[data-column]",
              ) as HTMLElement) ?? null;
              if (!columnEl) return;

              // Determine drop index by comparing mouse Y with card midpoints.
              const cardEls = Array.from(
                columnEl.querySelectorAll<HTMLElement>("[data-card-id]"),
              );
              let dropIndex = cardEls.length;
              for (let i = 0; i < cardEls.length; i++) {
                const rect = cardEls[i].getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                if (e.clientY < midpoint) {
                  dropIndex = i;
                  break;
                }
              }

              const cardId = drag.draggingId;
              drag.draggingId = null;
              applyMove(cardId, col, dropIndex);
            }}
          >
            <h2>{COLUMN_LABELS[col]}</h2>
            <div class="card-list">
              {board[col].map((card) => (
                <div
                  key={card.id}
                  class="card"
                  data-card-id={card.id}
                  draggable
                  onDragStart$={(e) => {
                    drag.draggingId = card.id;
                    (e as DragEvent).dataTransfer?.setData(
                      "text/plain",
                      String(card.id),
                    );
                  }}
                  onDragEnd$={() => {
                    drag.draggingId = null;
                  }}
                >
                  {card.title}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Kanban Board",
  meta: [
    {
      name: "description",
      content: "A Kanban board with drag-and-drop and SQLite persistence",
    },
  ],
};
