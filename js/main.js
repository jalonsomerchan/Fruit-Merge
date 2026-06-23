import { MAX_MERGE_LEVEL, START_SIZE, MERGE_DELAY, MOVE_DELAY, STORAGE_KEY } from "./core/config.js";
import { areAdjacent, getTile, makeBoard, sameTile } from "./core/board.js";
import { settleBoard } from "./core/gravity.js";
import { hasPossibleMove } from "./core/moves.js";
import {
  findMatch3Groups,
  hasMatch3Move,
  makeMatch3Board,
  swapTiles
} from "./core/match3.js";
import {
  createTutorial,
  currentTutorialStep,
  isExpectedMergePath,
  isExpectedSwap,
  tutorialTargets
} from "./core/tutorials.js";
import { mergeScore } from "./core/scoring.js";
import { ui } from "./ui/elements.js";
import { bindInput } from "./ui/input.js";
import { burst, renderBoard, renderStats, resetRenderer, shockwave } from "./ui/render.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const posKey = (pos) => `${pos.x},${pos.y}`;

const PLAY_VARIANTS = {
  merge: { label: "Normal" },
  match3: { label: "Match 3" }
};

const GAME_MODES = {
  normal: { label: "Normal" },
  timed: { label: "Contrarreloj" },
  explosive: { label: "Explosivo" },
  simple: { label: "Simple" },
  limited: { label: "Movimientos" },
  obstacles: { label: "Obstaculos" },
  cleanup: { label: "Limpieza" }
};

const gameScreen = ui.screens.find((screen) => screen.dataset.screen === "game");

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
  variant: "merge",
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
  swapFrom: null,
  collecting: new Map(),
  exploding: new Set(),
  popped: null,
  locked: false,
  gameOver: false,
  turnTimerId: null,
  turnDeadline: 0,
  areaTimerId: null,
  tutorial: null,
  tutorialStepCompleted: false,
  tutorialTargetKeys: new Set(),
  tutorialStartKey: "",
  lastEndWasTutorial: false
};

function boot(size = game.size, difficulty = game.difficulty) {
  clearModeTimers();
  game.size = size;
  game.difficulty = difficulty || DIFFICULTIES[size] || "easy";
  game.tutorial = game.difficulty === "tutorial" ? createTutorial(game.variant, game.mode) : null;
  game.tutorialStepCompleted = false;
  game.board = makePlayableBoard(size);
  if (isTutorial() && game.board.length) game.size = game.board.length;
  game.score = 0;
  game.moves = 0;
  clearPath();
  clearSwapSelection();
  game.collecting.clear();
  game.exploding.clear();
  game.popped = null;
  game.locked = false;
  game.gameOver = false;
  game.lastEndWasTutorial = false;
  ui.dialog.close?.();
  ui.board.replaceChildren();
  closeMenu();
  resetRenderer();
  showScreen("game");
  draw(startMessage());
  startModeTimers();
}

function isMatch3Variant() {
  return game.variant === "match3";
}

function isTutorial() {
  return Boolean(game.tutorial && game.difficulty === "tutorial");
}

function samePos(a, b) {
  return a?.x === b?.x && a?.y === b?.y;
}

function currentStep() {
  return currentTutorialStep(game.tutorial);
}

function isTutorialTarget(pos) {
  if (!isTutorial() || !pos) return false;
  return tutorialTargets(currentStep()).some((target) => samePos(target, pos));
}

function isTutorialMergeEndpoint(pos) {
  if (!isTutorial() || !pos) return false;
  const step = currentStep();
  if (step?.action?.type !== "merge") return false;
  const path = step.action.path;
  return samePos(path[0], pos) || samePos(path.at(-1), pos);
}

function makePlayableBoard(size) {
  if (isTutorial()) return currentStep()?.board() ?? makeBoardForMode(size);

  let board = makeBoardForMode(size);
  let guard = 0;
  while (!boardHasPossibleMove(board) && guard < 80) {
    board = makeBoardForMode(size);
    guard += 1;
  }
  return board;
}

function makeBoardForMode(size) {
  const board = isMatch3Variant() ? makeMatch3Board(size) : makeBoard(size);
  if (game.mode === "obstacles") placeObstacles(board, OBSTACLE_COUNTS[game.difficulty] ?? OBSTACLE_COUNTS.easy);
  return board;
}

function boardHasPossibleMove(board) {
  return isMatch3Variant() ? hasMatch3Move(board) : hasPossibleMove(board);
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
  if (isTutorial()) return currentStep()?.message ?? "Tutorial listo.";

  if (isMatch3Variant()) {
    if (game.mode === "timed") return `Match 3 contrarreloj: combina antes de ${TIMED_LIMITS[game.difficulty]}s.`;
    if (game.mode === "explosive") return `Match 3 explosivo: se limpia una zona cada ${AREA_CLEAR_INTERVALS[game.difficulty]}s.`;
    if (game.mode === "simple") return "Match 3 simple: combina grupos sin cascadas encadenadas.";
    if (game.mode === "limited") return `Match 3 con movimientos limitados: tienes ${MOVE_LIMITS[game.difficulty]} movimientos validos.`;
    if (game.mode === "obstacles") return "Match 3 con obstaculos: las rocas bloquean intercambios y caidas.";
    if (game.mode === "cleanup") return "Match 3 limpieza: combina frutas sin que aparezcan nuevas.";
    return "Match 3: intercambia frutas vecinas para formar lineas de 3 o mas.";
  }

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
  updateTutorialCoach();
  updateTutorialTargets();
  renderBoard(ui, game);
}

function updateTutorialCoach() {
  if (!ui.tutorialCoach) return;

  const step = currentStep();
  const active = Boolean(isTutorial() && step);
  gameScreen?.classList.toggle("has-tutorial", active);
  ui.tutorialCoach.hidden = !active;

  if (!active) {
    ui.tutorialKicker.textContent = "Tutorial";
    ui.tutorialTitle.textContent = "";
    ui.tutorialBody.textContent = "";
    ui.tutorialInstruction.textContent = "";
    return;
  }

  ui.tutorialKicker.textContent = `Paso ${game.tutorial.current + 1} de ${game.tutorial.steps.length}`;
  ui.tutorialTitle.textContent = step.title ?? "Paso guiado";
  ui.tutorialBody.textContent = step.body ?? "";
  ui.tutorialInstruction.textContent = step.instruction ?? step.message ?? "";
}

function updateTutorialTargets() {
  game.tutorialTargetKeys = new Set();
  game.tutorialStartKey = "";
  if (!isTutorial()) return;

  const step = currentStep();
  tutorialTargets(step).forEach((pos) => game.tutorialTargetKeys.add(posKey(pos)));

  if (step?.action?.type === "merge") game.tutorialStartKey = posKey(step.action.path[0]);
  if (step?.action?.type === "swap") game.tutorialStartKey = posKey(step.action.from);
}

function updateModeHud() {
  const variantLabel = PLAY_VARIANTS[game.variant]?.label ?? "Normal";
  const modeLabel = GAME_MODES[game.mode]?.label ?? "Normal";
  ui.modeLabel.textContent = `${variantLabel} · ${modeLabel}`;

  if (isTutorial()) {
    const current = Math.min(game.tutorial.current + 1, game.tutorial.steps.length);
    ui.modeTimer.textContent = `Paso ${current}/${game.tutorial.steps.length}`;
    ui.modeTimer.hidden = false;
    return;
  }

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

  if (isMatch3Variant()) {
    ui.modeTimer.textContent = "3+";
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

function clearSwapSelection() {
  game.swapFrom = null;
}

function cancelMergePath(message = "Movimiento cancelado.") {
  clearPath();
  clearSwapSelection();
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

function formatNumber(value) {
  return value.toLocaleString("es-ES");
}

function gameModeName() {
  const variantLabel = PLAY_VARIANTS[game.variant]?.label ?? "Normal";
  const modeLabel = GAME_MODES[game.mode]?.label ?? "Normal";
  return `${variantLabel} · ${modeLabel}`;
}

function boardSummary() {
  return isTutorial() ? "Tutorial 8x8" : `${game.size}x${game.size}`;
}

function endGameResourceLabel() {
  if (game.mode === "obstacles") return `${countFruitTiles()} frutas · ${countObstacles()} rocas`;
  if (game.mode === "cleanup") return `${countFruitTiles()} frutas restantes`;
  return `${countFruitTiles()} frutas`;
}

function beginMergePath(pos) {
  if (game.locked || game.gameOver) return;
  if (isMatch3Variant()) {
    beginMatch3Swap(pos);
    return;
  }

  if (isTutorial() && !isTutorialMergeEndpoint(pos)) {
    draw("Empieza arrastrando desde uno de los extremos iluminados.");
    return;
  }

  const tile = getTile(game.board, pos);
  if (!isFruitTile(tile) || tile.level >= MAX_MERGE_LEVEL) return;
  game.origin = pos;
  game.path = [pos];
  rebuildPathKeys();
  draw(isTutorial() ? "Sigue las casillas iluminadas del tutorial." : "Arrastra por frutas iguales adyacentes.");
}

function extendMergePath(pos) {
  if (isMatch3Variant()) return;
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

  if (isTutorial() && !isTutorialTarget(pos)) return;

  const last = game.path.at(-1);
  const startTile = getTile(game.board, game.origin);
  const tile = getTile(game.board, pos);
  if (!areAdjacent(last, pos) || !sameTile(startTile, tile)) return;

  game.path.push(pos);
  rebuildPathKeys();
  draw(`${game.path.length} frutas listas para fusionar.`);
}

async function endMergePath(pos) {
  if (isMatch3Variant()) {
    await endMatch3Swap(pos);
    return;
  }

  if (game.locked || game.gameOver || !game.path.length) return;
  if (game.path.length < 2) {
    cancelMergePath();
    return;
  }
  await mergePath();
}

function beginMatch3Swap(pos) {
  if (game.locked || game.gameOver) return;

  if (isTutorial() && !isTutorialTarget(pos)) {
    draw("Toca una de las dos casillas iluminadas.");
    return;
  }

  const tile = getTile(game.board, pos);
  if (!isFruitTile(tile)) return;
  game.swapFrom = pos;
  clearPath();
  draw(isTutorial() ? "Ahora toca o arrastra hasta la otra casilla iluminada." : "Suelta sobre una fruta vecina para intercambiar.");
}

async function endMatch3Swap(pos) {
  if (game.locked || game.gameOver || !game.swapFrom) return;
  const from = game.swapFrom;
  const target = pos ?? from;

  if (!target || samePos(target, from)) {
    if (isTutorial()) {
      draw("Primera casilla seleccionada. Ahora toca la otra iluminada.");
      return;
    }

    clearSwapSelection();
    draw("Intercambio cancelado.");
    return;
  }

  if (isTutorial() && !isExpectedSwap(currentStep(), from, target)) {
    draw("Usa la otra casilla iluminada para completar el paso.");
    return;
  }

  clearSwapSelection();
  await tryMatch3Swap(from, target);
}

async function tryMatch3Swap(from, to) {
  if (isTutorial() && !isExpectedSwap(currentStep(), from, to)) {
    draw("En el tutorial tienes que usar las dos casillas iluminadas.");
    return;
  }

  if (!isOrthogonalAdjacent(from, to)) {
    draw("Intercambia solo frutas vecinas.");
    return;
  }

  if (!isFruitTile(getTile(game.board, from)) || !isFruitTile(getTile(game.board, to))) return;

  game.locked = true;
  swapTiles(game.board, from, to);
  game.moves += 1;
  draw("Intercambiando frutas...");
  await wait(160);

  let groups = findMatch3Groups(game.board);
  if (!groups.length) {
    swapTiles(game.board, from, to);
    game.moves -= 1;
    game.locked = false;
    draw(isTutorial() ? "Ese paso no ha creado una linea. Prueba de nuevo con las casillas marcadas." : "Ese movimiento no forma ninguna linea.");
    return;
  }

  clearTurnTimer();
  await resolveMatch3Cascades(groups);
  completeTutorialStep();
  finishTurn();
}

async function resolveMatch3Cascades(initialGroups = null) {
  let groups = initialGroups ?? findMatch3Groups(game.board);
  let combo = 1;
  const allowCascades = game.mode !== "simple";
  const spawn = game.mode !== "cleanup" && !isTutorial();

  while (groups.length && !game.gameOver) {
    const cells = uniquePositions(groups.flat());
    game.exploding = new Set(cells.map(posKey));
    const longest = groups.reduce((max, group) => Math.max(max, group.length), 0);
    draw(combo > 1 ? `Combo x${combo}: ${cells.length} frutas.` : `${cells.length} frutas combinadas.`);
    await wait(300);

    for (const pos of cells) game.board[pos.y][pos.x] = null;
    game.score += cells.length * 15 * combo + Math.max(0, longest - 3) * 35 * combo;
    saveBestScore();

    game.exploding.clear();
    const center = cells[Math.floor(cells.length / 2)];
    if (center) burst(ui, center);
    settleBoard(game.board, { spawn });
    draw(spawn ? "Cascada de frutas..." : "Frutas limpiadas...");
    await wait(MOVE_DELAY + 120);

    if (!allowCascades || isTutorial()) break;
    groups = findMatch3Groups(game.board);
    combo += 1;
  }

  game.locked = false;
  draw(isTutorial() ? "Jugada del tutorial completada." : "Intercambia frutas para formar lineas de 3 o mas.");
}

function uniquePositions(positions) {
  const seen = new Set();
  return positions.filter((pos) => {
    const key = posKey(pos);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isOrthogonalAdjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

async function mergePath() {
  if (isTutorial() && !isExpectedMergePath(currentStep(), game.path)) {
    cancelMergePath("En el tutorial tienes que seguir exactamente las casillas iluminadas.");
    return;
  }

  game.locked = true;
  clearTurnTimer();

  if (game.mode === "simple") {
    await mergeClearingPath({ spawn: !isTutorial(), label: "Fusion simple completada." });
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
  completeTutorialStep();

  game.collecting.clear();
  game.popped = destinationTile.id;
  burst(ui, destination);
  clearPath();
  draw(`Fusion x${2 ** levelBoost}.`);
  await wait(MERGE_DELAY);

  if (destinationTile.level >= MAX_MERGE_LEVEL && !isTutorial()) {
    await explodeMaxFruit(destination);
  }

  game.popped = null;
  settleBoard(game.board, { spawn: !isTutorial() });
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
  completeTutorialStep();

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

function completeTutorialStep() {
  if (isTutorial()) game.tutorialStepCompleted = true;
}

function advanceTutorialIfNeeded() {
  if (!isTutorial() || !game.tutorialStepCompleted) return false;

  game.tutorialStepCompleted = false;
  game.tutorial.current += 1;

  if (game.tutorial.current >= game.tutorial.steps.length) {
    endGame("Tutorial completado. Ya puedes jugar este modo.");
    return true;
  }

  clearPath();
  clearSwapSelection();
  game.collecting.clear();
  game.exploding.clear();
  game.popped = null;
  game.board = currentStep().board();
  game.size = game.board.length || game.size;
  ui.board.replaceChildren();
  resetRenderer();
  draw(currentStep().message);
  return true;
}

function finishTurn() {
  if (game.gameOver) return;
  game.locked = false;

  if (advanceTutorialIfNeeded()) return;

  if (game.mode === "cleanup" && countFruitTiles() === 0) {
    endGame("Limpieza completada: tablero vacio.");
    return;
  }

  if (game.mode === "limited" && getRemainingMoves() <= 0) {
    endGame("Sin movimientos: partida terminada.");
    return;
  }

  if (!boardHasPossibleMove(game.board)) {
    endGame(game.mode === "cleanup" ? "No quedan combinaciones para seguir limpiando." : "La partida ha terminado: no hay movimientos posibles.");
    return;
  }

  draw(isMatch3Variant() ? "Intercambia frutas para formar lineas de 3 o mas." : "Traza una cadena de frutas iguales para fusionar.");
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
  if (isTutorial()) {
    updateModeHud();
    return;
  }
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
  if (game.mode !== "timed" || game.gameOver || isTutorial()) return;
  clearTurnTimer();
  const limit = TIMED_LIMITS[game.difficulty] ?? TIMED_LIMITS.easy;
  game.turnDeadline = Date.now() + limit * 1000;
  updateModeHud();

  game.turnTimerId = window.setInterval(() => {
    updateModeHud();
    if (Date.now() < game.turnDeadline || game.locked) return;
    endGame("Tiempo agotado: no hiciste un movimiento valido a tiempo.");
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
  if (isTutorial() || game.mode !== "explosive" || game.locked || game.gameOver) return;
  const filled = [];
  for (let y = 0; y < game.size; y += 1) {
    for (let x = 0; x < game.size; x += 1) {
      if (isFruitTile(game.board[y][x])) filled.push({ x, y });
    }
  }
  if (!filled.length) return;

  game.locked = true;
  clearPath();
  clearSwapSelection();
  const origin = filled[Math.floor(Math.random() * filled.length)];
  const removed = getAreaTiles(origin);
  game.exploding = new Set(removed.map(posKey));
  shockwave(ui, origin);
  draw("Modo explosivo: zona eliminada.");
  await wait(520);

  for (const pos of removed) game.board[pos.y][pos.x] = null;
  game.exploding.clear();
  settleBoard(game.board, { spawn: game.mode !== "cleanup" });
  draw();
  await wait(MOVE_DELAY);
  if (isMatch3Variant()) {
    const groups = findMatch3Groups(game.board);
    if (groups.length) await resolveMatch3Cascades(groups);
  }
  finishTurn();
}

function endGame(message) {
  if (game.gameOver) return;
  const tutorialCompleted = Boolean(isTutorial() && game.tutorial.current >= game.tutorial.steps.length);
  game.gameOver = true;
  game.lastEndWasTutorial = tutorialCompleted;
  clearModeTimers();
  clearPath();
  clearSwapSelection();
  game.locked = true;
  const scoreText = formatNumber(game.score);
  const bestText = formatNumber(game.best);
  ui.modalScore.textContent = scoreText;
  ui.modalBest.textContent = bestText;
  ui.modalMoves.textContent = formatNumber(game.moves);
  ui.modalMode.textContent = gameModeName();
  ui.modalBoard.textContent = boardSummary();
  ui.modalFruits.textContent = endGameResourceLabel();

  if (tutorialCompleted) {
    ui.modalKicker.textContent = "Tutorial completado";
    ui.modalTitle.textContent = "Ya sabes jugar este modo";
    ui.modalMessage.innerHTML = `Has terminado el tutorial de <strong>${gameModeName()}</strong>. Ahora prueba una partida normal: misma mecanica, tablero vivo y puntuacion real.`;
    ui.playAgain.textContent = "Jugar partida normal";
  } else {
    ui.modalKicker.textContent = "Resumen";
    ui.modalTitle.textContent = "Partida terminada";
    ui.modalMessage.innerHTML = `Tu puntuacion final ha sido <strong>${scoreText}</strong>.`;
    ui.playAgain.textContent = "Jugar otra vez";
  }

  ui.dialog.showModal();
  ui.status.textContent = message;
  renderStats(ui, game);
  updateModeHud();
  updateTutorialCoach();
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

function shareUrl() {
  return window.location.origin + window.location.pathname;
}

async function shareGame() {
  const shareData = {
    title: "Fruit Merge",
    text: "Fusiona frutas, juega Match 3 y supera modos especiales.",
    url: shareUrl()
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      ui.shareFeedback.textContent = "Compartido.";
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.url);
      ui.shareFeedback.textContent = "Enlace copiado.";
      return;
    }

    ui.shareFeedback.textContent = `Enlace: ${shareData.url}`;
  } catch (error) {
    if (error?.name === "AbortError") return;
    ui.shareFeedback.textContent = `Enlace: ${shareData.url}`;
  }
}

ui.startGame.addEventListener("click", () => showScreen("variants"));
ui.aboutGame.addEventListener("click", () => ui.aboutDialog.showModal());
ui.closeAbout.addEventListener("click", () => ui.aboutDialog.close());
ui.shareGame.addEventListener("click", shareGame);
ui.backToStart.addEventListener("click", () => showScreen("start"));
ui.backToVariants.addEventListener("click", () => showScreen("variants"));
ui.backToModes.addEventListener("click", () => showScreen("modes"));
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
  showScreen("variants");
});
ui.playAgain.addEventListener("click", () => {
  if (game.lastEndWasTutorial) {
    boot(8, "easy");
    return;
  }
  boot();
});
ui.variantButtons.forEach((button) => {
  button.addEventListener("click", () => {
    game.variant = button.dataset.variant;
    showScreen("modes");
  });
});
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
