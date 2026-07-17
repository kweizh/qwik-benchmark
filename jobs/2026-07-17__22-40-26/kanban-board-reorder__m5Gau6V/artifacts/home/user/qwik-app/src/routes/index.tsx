import {
  $,
  component$,
  noSerialize,
  useSignal,
  useStore,
  type NoSerialize,
  type QRL,
} from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { COLUMNS, readBoard, type Board, type ColumnKey } from "~/lib/db";

export const useBoard = routeLoader$<Board>(() => {
  return readBoard();
});

interface DragState {
  cardId: number | null;
  fromColumn: ColumnKey | null;
  hoverColumn: ColumnKey | null;
  // The drop index inside the target column. When the user drops in an empty
  // column (or below the last card), this is the target column length.
  hoverIndex: number;
}

export default component$(() => {
  const boardSig = useBoard();
  // Client-side mutable copy of the board, kept in sync with the server. We
  // intentionally don't mutate `boardSig.value` because Qwik signals are
  // immutable from the client's perspective; the store below is the source
  // of truth for the UI between server roundtrips.
  const local = useStore<Board>(
    structuredClone(boardSig.value) as Board,
    { deep: true },
  );

  const drag = useStore<DragState>({
    cardId: null,
    fromColumn: null,
    hoverColumn: null,
    hoverIndex: 0,
  });

  // Used to dedupe POST /api/move when the user drops a card back where it
  // started. We only persist when the destination actually differs from the
  // original column/index.
  const lastMove = useSignal<NoSerialize<{
    cardId: number;
    fromColumn: ColumnKey;
    fromIndex: number;
  } | null>>(noSerialize(null));

  const persistMove$: QRL<
    (cardId: number, toColumn: ColumnKey, toIndex: number) => Promise<void>
  > = $(async (cardId: number, toColumn: ColumnKey, toIndex: number) => {
    try {
      const res = await fetch("/api/move", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardId, toColumn, toIndex }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Board;
        // Reflect server-authoritative ordering in the local store.
        local.todo = updated.todo;
        local.doing = updated.doing;
        local.done = updated.done;
      }
    } catch {
      // Network errors are non-fatal for the UI; the user can retry by
      // refreshing the page (which is server-rendered from the DB).
    }
  });

  const onDragStart$ = $((e: DragEvent, cardId: number, fromColumn: ColumnKey) => {
    if (!e.dataTransfer) return;
    drag.cardId = cardId;
    drag.fromColumn = fromColumn;
    drag.hoverColumn = fromColumn;
    const fromIndex = local[fromColumn].findIndex((c) => c.id === cardId);
    drag.hoverIndex = fromIndex >= 0 ? fromIndex : 0;
    lastMove.value = noSerialize({ cardId, fromColumn, fromIndex });
    e.dataTransfer.effectAllowed = "move";
    // Use a plain text payload so Firefox/Chrome both trigger dragover reliably.
    e.dataTransfer.setData("text/plain", String(cardId));
    (e.currentTarget as HTMLElement).classList.add("dragging");
  });

  const onDragEnd$ = $((e: DragEvent) => {
    (e.currentTarget as HTMLElement)?.classList.remove("dragging");
    drag.cardId = null;
    drag.fromColumn = null;
    drag.hoverColumn = null;
    drag.hoverIndex = 0;
    // Clear drop-active styling on all columns.
    const cols = document.querySelectorAll<HTMLElement>(".cards");
    cols.forEach((c) => c.classList.remove("drop-active"));
  });

  const onColumnDragOver$ = $(
    (e: DragEvent, column: ColumnKey) => {
      if (drag.cardId === null) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      drag.hoverColumn = column;
      // The column-level dragover fires only when the pointer is over the
      // padding/gap of the column (between or around cards). Default to
      // appending at the end; if the user moves the pointer over an actual
      // card, the card-level handler will refine the index.
      drag.hoverIndex = local[column].length;
      const cardsEl = e.currentTarget as HTMLElement;
      cardsEl.classList.add("drop-active");
    },
  );

  const onColumnDragLeave$ = $((e: DragEvent) => {
    // Only clear when we actually leave the cards container.
    const related = e.relatedTarget as Node | null;
    const current = e.currentTarget as Node;
    if (!related || !current.contains(related)) {
      (e.currentTarget as HTMLElement).classList.remove("drop-active");
    }
  });

  // When dragging over an individual card, compute the insertion index based
  // on whether the pointer is in the top or bottom half of the card.
  const onCardDragOver$ = $(
    (e: DragEvent, column: ColumnKey, index: number, cardId: number) => {
      if (drag.cardId === null) return;
      if (cardId === drag.cardId) return; // Don't insert before self.
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const insertBefore = offsetY < rect.height / 2;
      drag.hoverColumn = column;
      drag.hoverIndex = insertBefore ? index : index + 1;
    },
  );

  const onDrop$ = $(async (e: DragEvent, column: ColumnKey) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove("dragging");
    if (drag.cardId === null) return;

    const cardId = drag.cardId;
    const toColumn = column;
    let toIndex = drag.hoverIndex;
    if (toIndex < 0) toIndex = 0;

    // Update the local UI immediately for snappy feedback.
    const fromColumn = drag.fromColumn!;
    const cardIdx = local[fromColumn].findIndex((c) => c.id === cardId);
    if (cardIdx === -1) {
      // Stale drag state; bail out.
      drag.cardId = null;
      drag.fromColumn = null;
      drag.hoverColumn = null;
      drag.hoverIndex = 0;
      return;
    }
    const [moving] = local[fromColumn].splice(cardIdx, 1);
    if (toIndex > local[toColumn].length) {
      toIndex = local[toColumn].length;
    }
    local[toColumn].splice(toIndex, 0, moving);

    // Persist only when something actually changed (dropping a card on its
    // own slot shouldn't issue a no-op round trip).
    const origin = lastMove.value;
    const changed =
      !origin ||
      origin.fromColumn !== toColumn ||
      origin.fromIndex !== toIndex;

    // Reset drag state.
    drag.cardId = null;
    drag.fromColumn = null;
    drag.hoverColumn = null;
    drag.hoverIndex = 0;
    const cols = document.querySelectorAll<HTMLElement>(".cards");
    cols.forEach((c) => c.classList.remove("drop-active"));

    if (changed) {
      await persistMove$(cardId, toColumn, toIndex);
    }
  });

  return (
    <>
      <h1>Kanban Board</h1>
      <p class="subtitle">
        Drag cards between columns or reorder them. State persists across reloads.
      </p>
      <section class="board">
        {COLUMNS.map((column) => (
          <div key={column} class="column" data-column={column}>
            <h2 class="column-title">{column}</h2>
            <div
              class="cards"
              data-cards-for={column}
              onDragOver$={(e) => onColumnDragOver$(e, column)}
              onDragLeave$={onColumnDragLeave$}
              onDrop$={(e) => onDrop$(e, column)}
            >
              {local[column].length === 0 && (
                <div
                  class="card"
                  style="visibility:hidden;height:48px;pointer-events:none;"
                  aria-hidden="true"
                />
              )}
              {local[column].map((card, index) => (
                <div
                  key={card.id}
                  class="card"
                  data-card-id={card.id}
                  draggable={true}
                  onDragStart$={(e) => onDragStart$(e, card.id, column)}
                  onDragEnd$={onDragEnd$}
                  onDragOver$={(e) => onCardDragOver$(e, column, index, card.id)}
                  onDrop$={(e) => onDrop$(e, column)}
                >
                  {card.title}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
});

export const head = {
  title: "Kanban Board",
  meta: [
    {
      name: "description",
      content: "Qwik City Kanban board with drag-and-drop and SQLite persistence",
    },
  ],
};
