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

const GAME_MODES = {
  normal: { label: "Normal" },
  timed: { label: "Contrarreloj" },
  explosive: { label: "Explosivo" },
  simple: { label: "Simple" },
  limited: { label: "Movimientos" },
  obstacles: { label: "Obstaculos" },
  cleanup: { label: "Limpieza" }
};

const DIFFICULTIES = {
  8: "easy",
  9: "medium",
  10: "hard"
};

const TIMED_LIMITS = {
  easy: 10,
  medium: 6,
  hard: 3
};

const AREA_CLEAR_INTERVALS = {
  easy: 15,
  medium: 10,
  hard: 7
};

const MOVE_LIMITS = {
  easy: 35,
  medium: 25,
  hard: 18
};

const OBSTACLE_COUNTS = {
  easy: 6,
  medium: 10,
  hard: 14
};

const game = {
  mode: "normal",
  difficulty: "easy",
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
  locked: false,
  gameOver: false,
  turnTimerId: null,
  turnDeadline: 0,
  areaTimerId: null
};

function boot(size = game.size, difficulty = game.difficulty) {
  clearModeTimers();
  game.size = size;
  game.difficulty = difficulty || DIFFICULTIES[size] || "easy";
  game.board = makePlayableBoard(size);
  game.score = 0;
  game.moves = 0;
  clearPath();
  game.collecting.clear();
  game.exploding.clear();
  game.popped = null;
  game.locked = false;
  game.gameOver = false;
  ui.dialog.close?.();
  ui.board.replaceChildren();
  closeMenu();
  resetRenderer();
  showScreen("game");
  draw(startMessage());
  startModeTimers();
}

function makePlayableBoard(size) {
  let board = makeBoardForMode(size);
  let guard = 0;
  while (!hasPossibleMove(board) && guard < 80) {
    board = makeBoardForMode(size);
    guard += 1;
  }
  return board;
}

function makeBoardForMode(size) {
  const board = makeBoard(size);
  if (game.mode === "obstacles") placeObstacles(board, OBSTACLE_COUNTS[game.difficulty] ?? OBSTACLE_COUNTS.easy);
  return board;
}

function placeObstacles(board, total) {
  const size = board.length;
  const used = new Set();
  let guard = 0;

  while (used.size < total && guard < size * size * 4) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    const key = posKey({ x, y });
    guard += 1;
    if (used.has(key)) continue;

    used.add(key);
    board[y][x] = {
      id: `obstacle-${Date.now()}-${x}-${y}-${used.size}`,
      type: "obstacle",
      fresh: false
    };
  }
}

function startMessage() {
  if (game.mode === "timed") return `Contrarreloj: fusiona antes de ${TIMED_LIMITS[game.difficulty]}s.`;
  if (game.mode === "explosive") return `Explosivo: se limpia una zona cada ${AREA_CLEAR_INTERVALS[game.difficulty]}s.`;
  if (game.mode === "simple") return "Simple: las frutas fusionadas desaparecen.";
  if (game.mode === "limited") return `Movimientos limitados: tienes ${MOVE_LIMITS[game.difficulty]} fusiones.`;
  if (game.mode === "obstacles") return "Obstaculos: las rocas bloquean el tablero.";
  if (game.mode === "cleanup") return "Limpieza: vacia el tablero sin que aparezcan frutas nuevas.";
  return "Nueva partida lista.";
}

function draw(message) {
  if (message) ui.status.textContent = message;
  renderStats(ui, game);
  updateModeHud();
  renderBoard(ui, game);
}

function updateModeHud() {
  ui.modeLabel.textContent = GAME_MODES[game.mode]?.label ?? "Normal";

  if (game.mode === "timed" && game.turnDeadline) {
    const remaining = Math.max(0, Math.ceil((game.turnDeadline - Date.now()) / 1000));
    ui.modeTimer.textContent = `${remaining}s`;
    ui.modeTimer.hidden = false;
    return;
  }

  if (game.mode === "explosive") {
    ui.modeTimer.textContent = `${AREA_CLEAR_INTERVALS[game.difficulty]}s`;
    ui.modeTimer.hidden = false;
    return;
  }

  if (game.mode === "limited") {
    ui.modeTimer.textContent = `${getRemainingMoves()} mov.`;
    ui.modeTimer.hidden = false;
    return;
  }

  if (game.mode === "obstacles") {
    ui.modeTimer.textContent = `${countObstacles()} obs.`;
    ui.modeTimer.hidden = false;
    return;
  }

  if (game.mode === "cleanup") {
    ui.modeTimer.textContent = `${countFruitTiles()} frutas`;
    ui.modeTimer.hidden = false;
    return;
  }

  ui.modeTimer.textContent = "";
  ui.modeTimer.hidden = true;
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

function isFruitTile(tile) {
  return Boolean(tile && tile.type !== "obstacle");
}

function countFruitTiles() {
  return game.board.flat().filter(isFruitTile).length;
}

function countObstacles() {
  return game.board.flat().filter((tile) => tile?.type === "obstacle").length;
}

function getRemainingMoves() {
  return Math.max(0, (MOVE_LIMITS[game.difficulty] ?? MOVE_LIMITS.easy) - game.moves);
}

function beginMergePath(pos) {
  if (game.locked || game.gameOver) return;
  const tile = getTile(game.board, pos);
  if (!isFruitTile(tile) || tile.level >= MAX_MERGE_LEVEL) return;
  game.origin = pos;
  game.path = [pos];
  rebuildPathKeys();
  draw("Arrastra por frutas iguales adyacentes.");
}

function extendMergePath(pos) {
  if (game.locked || game.gameOver || !game.origin || !game.path.length) return;
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
  if (game.locked || game.gameOver || !game.path.length) return;
  if (game.path.length < 2) {
    cancelMergePath();
    return;
  }
  await mergePath();
}

async function mergePath() {
  game.locked = true;
  clearTurnTimer();

  if (game.mode === "simple") {
    await mergeClearingPath({ spawn: true, label: "Fusion simple completada." });
    return;
  }

  if (game.mode === "cleanup") {
    await mergeClearingPath({ spawn: false, label: "Frutas limpiadas." });
    return;
  }

  const destination = game.path.at(-1);
  const destinationTile = getTile(game.board, destination);
  if (!isFruitTile(destinationTile)) {
    game.locked = false;
    startTurnTimer();
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
  saveBestScore();

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

async function mergeClearingPath({ spawn, label }) {
  const destination = game.path.at(-1);
  const originTile = getTile(game.board, game.origin);
  const groupSize = game.path.length;

  game.collecting.clear();
  for (const pos of game.path) {
    const tile = getTile(game.board, pos);
    if (tile) game.collecting.set(tile.id, { x: destination.x - pos.x, y: destination.y - pos.y });
  }
  draw(`${groupSize} frutas desaparecen.`);
  await wait(240);

  for (const pos of game.path) game.board[pos.y][pos.x] = null;
  game.moves += 1;
  game.score += mergeScore(originTile?.level ?? 0) * groupSize;
  saveBestScore();

  game.collecting.clear();
  burst(ui, destination);
  clearPath();
  draw(label);
  await wait(MERGE_DELAY);

  settleBoard(game.board, { spawn });
  draw();
  await wait(MOVE_DELAY);
  finishTurn();
}

function finishTurn() {
  if (game.gameOver) return;
  game.locked = false;

  if (game.mode === "cleanup" && countFruitTiles() === 0) {
    endGame("Limpieza completada: tablero vacio.");
    return;
  }

  if (game.mode === "limited" && getRemainingMoves() <= 0) {
    endGame("Sin movimientos: partida terminada.");
    return;
  }

  if (!hasPossibleMove(game.board)) {
    endGame(game.mode === "cleanup" ? "No quedan fusiones para seguir limpiando." : "La partida ha terminado: no hay movimientos posibles.");
    return;
  }

  draw("Traza una cadena de frutas iguales para fusionar.");
  startTurnTimer();
}

async function explodeMaxFruit(origin) {
  const removed = getAreaTiles(origin);

  game.exploding = new Set(removed.map(posKey));
  shockwave(ui, origin);
  draw("Nivel maximo: limpieza de zona.");
  await wait(520);

  for (const pos of removed) game.board[pos.y][pos.x] = null;
  game.score += 40 * removed.length;
  saveBestScore();
  game.exploding.clear();
}

function getAreaTiles(origin) {
  const removed = [];
  for (let y = origin.y - 1; y <= origin.y + 1; y += 1) {
    for (let x = origin.x - 1; x <= origin.x + 1; x += 1) {
      const tile = game.board[y]?.[x];
      if (!isFruitTile(tile)) continue;
      removed.push({ x, y });
    }
  }
  return removed;
}

function saveBestScore() {
  game.best = Math.max(game.best, game.score);
  localStorage.setItem(STORAGE_KEY, game.best.toString());
}

function startModeTimers() {
  clearModeTimers();
  if (game.mode === "timed") startTurnTimer();
  if (game.mode === "explosive") startAreaTimer();
  updateModeHud();
}

function clearModeTimers() {
  clearTurnTimer();
  if (game.areaTimerId) window.clearInterval(game.areaTimerId);
  game.areaTimerId = null;
}

function startTurnTimer() {
  if (game.mode !== "timed" || game.gameOver) return;
  clearTurnTimer();
  const limit = TIMED_LIMITS[game.difficulty] ?? TIMED_LIMITS.easy;
  game.turnDeadline = Date.now() + limit * 1000;
  updateModeHud();

  game.turnTimerId = window.setInterval(() => {
    updateModeHud();
    if (Date.now() < game.turnDeadline || game.locked) return;
    endGame("Tiempo agotado: no hiciste una fusion a tiempo.");
  }, 180);
}

function clearTurnTimer() {
  if (game.turnTimerId) window.clearInterval(game.turnTimerId);
  game.turnTimerId = null;
  game.turnDeadline = 0;
  updateModeHud();
}

function startAreaTimer() {
  const interval = (AREA_CLEAR_INTERVALS[game.difficulty] ?? AREA_CLEAR_INTERVALS.easy) * 1000;
  game.areaTimerId = window.setInterval(() => {
    clearRandomArea();
  }, interval);
}

async function clearRandomArea() {
  if (game.mode !== "explosive" || game.locked || game.gameOver) return;
  const filled = [];
  for (let y = 0; y < game.size; y += 1) {
    for (let x = 0; x < game.size; x += 1) {
      if (isFruitTile(game.board[y][x])) filled.push({ x, y });
    }
  }
  if (!filled.length) return;

  game.locked = true;
  clearPath();
  const origin = filled[Math.floor(Math.random() * filled.length)];
  const removed = getAreaTiles(origin);
  game.exploding = new Set(removed.map(posKey));
  shockwave(ui, origin);
  draw("Modo explosivo: zona eliminada.");
  await wait(520);

  for (const pos of removed) game.board[pos.y][pos.x] = null;
  game.exploding.clear();
  settleBoard(game.board);
  draw();
  await wait(MOVE_DELAY);
  finishTurn();
}

function endGame(message) {
  if (game.gameOver) return;
  game.gameOver = true;
  clearModeTimers();
  clearPath();
  game.locked = true;
  ui.finalScore.textContent = game.score.toLocaleString("es-ES");
  ui.dialog.showModal();
  ui.status.textContent = message;
  renderStats(ui, game);
  updateModeHud();
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

ui.startGame.addEventListener("click", () => showScreen("modes"));
ui.menuToggle.addEventListener("click", toggleMenu);
ui.restart.addEventListener("click", () => boot());
ui.changeLevel.addEventListener("click", () => {
  closeMenu();
  clearModeTimers();
  showScreen("levels");
});
ui.changeMode.addEventListener("click", () => {
  closeMenu();
  clearModeTimers();
  showScreen("modes");
});
ui.playAgain.addEventListener("click", () => boot());
ui.modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    game.mode = button.dataset.mode;
    showScreen("levels");
  });
});
ui.levelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    boot(Number(button.dataset.size), button.dataset.difficulty);
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
updateModeHud();
