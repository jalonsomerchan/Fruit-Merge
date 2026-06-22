import { areAdjacent, getTile, positions, sameTile } from "./board.js";
import { MAX_MERGE_LEVEL } from "./config.js";

const DIRECTIONS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 }
];

export function mergeTiles(board, from, to) {
  const origin = getTile(board, from);
  const target = getTile(board, to);
  if (!areAdjacent(from, to) || !sameTile(origin, target) || target.level >= MAX_MERGE_LEVEL) return null;

  board[to.y][to.x] = {
    ...target,
    id: `${target.id}-m`,
    level: target.level + 1,
    fresh: false
  };
  board[from.y][from.x] = null;
  return board[to.y][to.x];
}

export function hasMerge(board) {
  return positions(board).some((pos) => {
    const tile = getTile(board, pos);
    return DIRECTIONS.some((dir) => sameTile(tile, getTile(board, { x: pos.x + dir.x, y: pos.y + dir.y })));
  });
}

export function hasPossibleMove(board) {
  return hasMerge(board);
}
