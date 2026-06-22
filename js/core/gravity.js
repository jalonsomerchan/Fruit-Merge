import { createTile } from "./board.js";

export function settleBoard(board) {
  const size = board.length;
  const spawned = [];

  for (let x = 0; x < size; x += 1) {
    const kept = [];
    for (let y = size - 1; y >= 0; y -= 1) {
      if (board[y][x]) kept.push(board[y][x]);
    }

    for (let y = size - 1; y >= 0; y -= 1) {
      const next = kept[size - 1 - y] ?? createTile();
      board[y][x] = next;
      if (next.fresh) spawned.push(next.id);
    }
  }

  return spawned;
}
