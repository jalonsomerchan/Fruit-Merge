import { createTile } from "./board.js";

function isObstacle(tile) {
  return tile?.type === "obstacle";
}

function hasAdjacentGap(board, x, y) {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const row = board[y + dy];
      if (!row) continue;
      if (row[x + dx] === null) return true;
    }
  }
  return false;
}

function breakObstaclesNextToGaps(board) {
  const broken = [];

  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board.length; x += 1) {
      if (isObstacle(board[y][x]) && hasAdjacentGap(board, x, y)) {
        broken.push({ x, y });
      }
    }
  }

  for (const { x, y } of broken) board[y][x] = null;
  return broken;
}

function settleSegment(board, x, fromY, toY, spawn) {
  const kept = [];

  for (let y = toY; y >= fromY; y -= 1) {
    const tile = board[y][x];
    if (tile && tile.type !== "obstacle") kept.push(tile);
  }

  for (let y = toY; y >= fromY; y -= 1) {
    const next = kept[toY - y] ?? (spawn ? createTile() : null);
    board[y][x] = next;
  }
}

export function settleBoard(board, options = {}) {
  const { spawn = true, breakObstacles = true } = options;
  const size = board.length;
  const spawned = [];

  if (breakObstacles) breakObstaclesNextToGaps(board);

  for (let x = 0; x < size; x += 1) {
    let segmentBottom = size - 1;

    for (let y = size - 1; y >= -1; y -= 1) {
      const tile = y >= 0 ? board[y][x] : null;
      if (y === -1 || tile?.type === "obstacle") {
        const segmentTop = y + 1;
        if (segmentTop <= segmentBottom) settleSegment(board, x, segmentTop, segmentBottom, spawn);
        if (tile?.type === "obstacle") board[y][x] = tile;
        segmentBottom = y - 1;
      }
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const tile = board[y][x];
      if (tile?.fresh) spawned.push(tile.id);
    }
  }

  return spawned;
}
