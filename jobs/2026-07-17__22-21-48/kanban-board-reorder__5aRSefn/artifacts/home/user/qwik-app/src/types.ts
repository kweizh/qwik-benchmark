// Shared, client-safe types for the Kanban board.

export type Column = "todo" | "doing" | "done";

export interface CardDTO {
  id: number;
  title: string;
  position: number;
}

export interface BoardDTO {
  todo: CardDTO[];
  doing: CardDTO[];
  done: CardDTO[];
}

export interface MoveRequest {
  cardId: number;
  toColumn: Column;
  toIndex: number;
}