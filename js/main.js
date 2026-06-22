import { MAX_MERGE_LEVEL, START_SIZE, MERGE_DELAY, MOVE_DELAY, STORAGE_KEY } from "./core/config.js";
import { areAdjacent, getTile, makeBoard, sameTile } from "./core/board.js";
import { settleBoard } from "./core/gravity.js";
import { hasPossibleMove } from "./core/moves.js";
import { mergeScore } from "./core/scoring.js";
import { ui } from "./ui/elements.js";
import { bindInput } from "./ui/input.js";
import { burst, renderBoard, renderStats, resetRenderer, shockwave } from "./ui/render.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const posKey = (pos) => `${pos.x},${pos.y}`;

const game = {
  size: START_SIZE,
  board: [],
  score: 0,
  moves: 0,
  best: Number(localStorage.getItem(STORAGE_KEY) || 0),
  origin: null,
  path: [],
  pathKeys: new Map(),
  collecting: new Map(),
  exploding: new Set(),
  popped: null,
  locked: false
};

function boot(size = game.size) {
  game.size = size;
  game.board = makePlayableBoard(size);
  game.score = 0;
  game.moves = 0;
  clearPath();
  game.collecting.clear();
  game.exploding.clear();
  game.popped = null;
  game.locked = false;
  ui.dialog.close?.();
  ui.board.replaceChildren();
  closeMenu();
  resetRenderer();
  showScreen("game");
  draw("Nueva partida lista.");
}

function makePlayableBoard(size) {
  let board = makeBoard(size);
  let guard = 0;
  while (!hasPossibleMove(board) && guard < 40) {
    board = makeBoard(size);
    guard += 1;
  }
  return board;
}

function draw(message) {
  if (message) ui.status.textContent = message;
  renderStats(ui, game);
  renderBoard(ui, game);
}

function showScreen(name) {
  ui.screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === name);
  });
}

function clearPath() {
  game.origin = null;
  game.path = [];
  game.pathKeys.clear();
}

function cancelMergePath(message = "Movimiento cancelado.") {
  clearPath();
  draw(message);
}

function rebuildPathKeys() {
  game.pathKeys.clear();
  game.path.forEach((pos, index) => game.pathKeys.set(posKey(pos), index + 1));
}

function mergeLevelBoost(groupSize) {
  return Math.ceil(groupSize / 2);
}

function beginMergePath(pos) {
  if (game.locked) return;
  const tile = getTile(game.board, pos);
  if (!tile || tile.level >= MAX_MERGE_LEVEL) return;
  game.origin = pos;
  game.path = [pos];
  rebuildPathKeys();
  draw("Arrastra por frutas iguales adyacentes.");
}

function extendMergePath(pos) {
  if (game.locked || !game.origin || !game.path.length) return;
  const key = posKey(pos);
  const existing = game.pathKeys.get(key);

  if (existing === 1 && game.path.length > 1) {
    cancelMergePath();
    return;
  }

  if (existing === game.path.length - 1) {
    game.path.pop();
    rebuildPathKeys();
    if (game.path.length === 1) {
      cancelMergePath();
      return;
    }
    draw("Camino ajustado.");
    return;
  }

  if (existing) return;

  const last = game.path.at(-1);
  const startTile = getTile(game.board, game.origin);
  const tile = getTile(game.board, pos);
  if (!areAdjacent(last, pos) || !sameTile(startTile, tile)) return;

  game.path.push(pos);
  rebuildPathKeys();
  draw(`${game.path.length} frutas listas para fusionar.`);
}

async function endMergePath() {
  if (game.locked || !game.path.length) return;
  if (game.path.length < 2) {
    cancelMergePath();
    return;
  }
  await mergePath();
}

async function mergePath() {
  game.locked = true;
  const destination = game.path.at(-1);
  const destinationTile = getTile(game.board, destination);
  if (!destinationTile) {
    game.locked = false;
    return;
  }

  const groupSize = game.path.length;
  const levelBoost = mergeLevelBoost(groupSize);
  const nextLevel = Math.min(destinationTile.level + levelBoost, MAX_MERGE_LEVEL);

  game.collecting.clear();
  for (const pos of game.path.slice(0, -1)) {
    const tile = getTile(game.board, pos);
    if (tile) game.collecting.set(tile.id, { x: destination.x - pos.x, y: destination.y - pos.y });
  }
  draw(`${groupSize} frutas vuelan al destino. x${2 ** levelBoost}`);
  await wait(260);

  for (const pos of game.path.slice(0, -1)) game.board[pos.y][pos.x] = null;
  destinationTile.level = nextLevel;
  destinationTile.id = `${destinationTile.id}-m`;
  destinationTile.fresh = false;
  game.moves += 1;
  game.score += mergeScore(destinationTile.level) * groupSize;
  game.best = Math.max(game.best, game.score);
  localStorage.setItem(STORAGE_KEY, game.best.toString());

  game.collecting.clear();
  game.popped = destinationTile.id;
  burst(ui, destination);
  clearPath();
  draw(`Fusion x${2 ** levelBoost}.`);
  await wait(MERGE_DELAY);

  if (destinationTile.level >= MAX_MERGE_LEVEL) {
    await explodeMaxFruit(destination);
  }

  game.popped = null;
  settleBoard(game.board);
  draw();
  await wait(MOVE_DELAY);
  finishTurn();
}

function finishTurn() {
  game.locked = false;
  if (!hasPossibleMove(game.board)) {
    ui.finalScore.textContent = game.score.toLocaleString("es-ES");
    ui.dialog.showModal();
    ui.status.textContent = "La partida ha terminado: no hay movimientos posibles.";
    renderStats(ui, game);
    return;
  }
  draw("Traza una cadena de frutas iguales para fusionar.");
}

async function explodeMaxFruit(origin) {
  const removed = [];
  for (let y = origin.y - 1; y <= origin.y + 1; y += 1) {
    for (let x = origin.x - 1; x <= origin.x + 1; x += 1) {
      if (!game.board[y]?.[x]) continue;
      removed.push({ x, y });
    }
  }

  game.exploding = new Set(removed.map(posKey));
  shockwave(ui, origin);
  draw("Nivel maximo: explosion de fruta.");
  await wait(520);

  for (const pos of removed) game.board[pos.y][pos.x] = null;
  game.score += 40 * removed.length;
  game.best = Math.max(game.best, game.score);
  localStorage.setItem(STORAGE_KEY, game.best.toString());
  game.exploding.clear();
}

function closeMenu() {
  ui.menuPanel.classList.remove("is-open");
  ui.menuPanel.setAttribute("aria-hidden", "true");
}

function toggleMenu() {
  const next = !ui.menuPanel.classList.contains("is-open");
  ui.menuPanel.classList.toggle("is-open", next);
  ui.menuPanel.setAttribute("aria-hidden", String(!next));
}

ui.startGame.addEventListener("click", () => showScreen("levels"));
ui.menuToggle.addEventListener("click", toggleMenu);
ui.restart.addEventListener("click", () => boot());
ui.changeLevel.addEventListener("click", () => {
  closeMenu();
  showScreen("levels");
});
ui.playAgain.addEventListener("click", () => boot());
ui.levelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    boot(Number(button.dataset.size));
  });
});

bindInput(ui, game, {
  start: beginMergePath,
  move: extendMergePath,
  end: endMergePath,
  cancel: () => {
    cancelMergePath("Fusion cancelada.");
  }
});
renderStats(ui, game);
