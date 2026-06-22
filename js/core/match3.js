import { createTile, getTile } from "./board.js";

const ORTHOGONAL_DIRECTIONS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 }
];

function isFruitTile(tile) {
  return Boolean(tile && tile.type !== "obstacle");
}

function sameFruit(a, b) {
  return isFruitTile(a) && isFruitTile(b) && a.fruit === b.fruit;
}

function createsLine(board, pos, tile) {
  const left1 = board[pos.y]?.[pos.x - 1];
  const left2 = board[pos.y]?.[pos.x - 2];
  const up1 = board[pos.y - 1]?.[pos.x];
  const up2 = board[pos.y - 2]?.[pos.x];

  return (sameFruit(tile, left1) && sameFruit(tile, left2)) || (sameFruit(tile, up1) && sameFruit(tile, up2));
}

function createMatch3Tile(board, pos) {
  let tile = createTile(0);
  let guard = 0;

  while (createsLine(board, pos, tile) && guard < 40) {
    tile = createTile(0);
    guard += 1;
  }

  tile.level = 0;
  return tile;
}

export function makeMatch3Board(size) {
  const board = Array.from({ length: size }, () => Array(size).fill(null));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      board[y][x] = createMatch3Tile(board, { x, y });
    }
  }

  return board;
}

export function swapTiles(board, a, b) {
  const next = board[a.y][a.x];
  board[a.y][a.x] = board[b.y][b.x];
  board[b.y][b.x] = next;
}

function lineGroups(board, orientation) {
  const size = board.length;
  const groups = [];
  const outerLimit = size;

  for (let outer = 0; outer < outerLimit; outer += 1) {
    let run = [];

    for (let inner = 0; inner <= size; inner += 1) {
      const pos = orientation === "row" ? { x: inner, y: outer } : { x: outer, y: inner };
      const tile = inner < size ? getTile(board, pos) : null;
      const previous = run.length ? getTile(board, run.at(-1)) : null;

      if (tile && previous && sameFruit(tile, previous)) {
        run.push(pos);
        continue;
      }

      if (run.length >= 3) groups.push(run);
      run = tile ? [pos] : [];
    }
  }

  return groups;
}

export function findMatch3Groups(board) {
  return [...lineGroups(board, "row"), ...lineGroups(board, "column")];
}

function hasAnyMatch(board) {
  return findMatch3Groups(board).length > 0;
}

function isOrthogonalAdjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

export function hasMatch3Move(board) {
  const size = board.length;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const from = { x, y };
      if (!isFruitTile(getTile(board, from))) continue;

      for (const dir of ORTHOGONAL_DIRECTIONS.slice(0, 2)) {
        const to = { x: x + dir.x, y: y + dir.y };
        if (!isOrthogonalAdjacent(from, to) || !isFruitTile(getTile(board, to))) continue;

        swapTiles(board, from, to);
        const valid = hasAnyMatch(board);
        swapTiles(board, from, to);

        if (valid) return true;
      }
    }
  }

  return false;
}
