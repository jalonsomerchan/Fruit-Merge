import { FRUITS, MAX_MERGE_LEVEL } from "./config.js";
import { choice, uid } from "./random.js";

export function createTile(level = 0) {
  return {
    id: uid(),
    fruit: choice(FRUITS).id,
    level,
    fresh: true
  };
}

export function makeBoard(size) {
  const board = Array.from({ length: size }, () => Array(size).fill(null));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) board[y][x] = createTile();
  }
  return board;
}

export function inside(board, pos) {
  return Boolean(board[pos.y] && board[pos.y][pos.x]);
}

export function getTile(board, pos) {
  return inside(board, pos) ? board[pos.y][pos.x] : null;
}

export function areAdjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

export function sameTile(a, b) {
  return a && b && a.fruit === b.fruit && a.level === b.level && a.level < MAX_MERGE_LEVEL;
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function positions(board) {
  const list = [];
  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board.length; x += 1) list.push({ x, y });
  }
  return list;
}
