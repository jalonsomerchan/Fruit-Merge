import { powerFor, spriteFor } from "../core/config.js";

const tileNodes = new Map();

function key(pos) {
  return `${pos.x},${pos.y}`;
}

function renderPathLinks(ui, game) {
  ui.board.querySelectorAll(".path-link").forEach((node) => node.remove());

  if (game.path.length < 2) return;

  for (let index = 1; index < game.path.length; index += 1) {
    const from = game.path[index - 1];
    const to = game.path[index];
    const link = document.createElement("span");
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const isHorizontal = dy === 0;
    const isVertical = dx === 0;
    const isPositiveDiagonal = dx * dy > 0;

    link.className = [
      "path-link",
      isHorizontal && "is-horizontal",
      isVertical && "is-vertical",
      !isHorizontal && !isVertical && "is-diagonal",
      !isHorizontal && !isVertical && (isPositiveDiagonal ? "is-diagonal-down" : "is-diagonal-up")
    ].filter(Boolean).join(" ");
    link.style.setProperty("--x", Math.min(from.x, to.x));
    link.style.setProperty("--y", Math.min(from.y, to.y));
    link.style.setProperty("--i", index);
    ui.board.append(link);
  }
}

export function renderStats(ui, game) {
  ui.score.textContent = game.score.toLocaleString("es-ES");
  ui.best.textContent = game.best.toLocaleString("es-ES");
  ui.moves.textContent = game.moves.toString();
}

function ensureNode(tile, ui) {
  let node = tileNodes.get(tile.id);
  if (!node) {
    node = document.createElement("button");
    node.className = "tile";
    node.type = "button";
    node.innerHTML = "<img alt=\"\" draggable=\"false\" />";
    ui.board.append(node);
    tileNodes.set(tile.id, node);
  }
  return node;
}

export function renderBoard(ui, game) {
  const seen = new Set();
  ui.board.style.setProperty("--size", game.size);
  renderPathLinks(ui, game);

  const destination = game.path.at(-1);

  for (let y = 0; y < game.size; y += 1) {
    for (let x = 0; x < game.size; x += 1) {
      const tile = game.board[y][x];
      if (!tile) continue;

      seen.add(tile.id);
      const node = ensureNode(tile, ui);
      const tileKey = key({ x, y });
      const image = node.querySelector("img");

      node.dataset.pos = tileKey;
      node.dataset.order = game.pathKeys.get(tileKey) ?? "";
      node.style.setProperty("--x", x);
      node.style.setProperty("--y", y);
      node.style.setProperty("--to-x", game.collecting.get(tile.id)?.x ?? 0);
      node.style.setProperty("--to-y", game.collecting.get(tile.id)?.y ?? 0);

      if (tile.type === "obstacle") {
        node.dataset.level = "";
        node.dataset.power = "";
        image.removeAttribute("src");
        node.ariaLabel = "Obstaculo";
      } else {
        node.dataset.level = Math.min(tile.level, 7).toString();
        node.dataset.power = powerFor(tile.level);
        image.src = spriteFor(tile);
        node.ariaLabel = `${tile.fruit} x${powerFor(tile.level)}`;
      }

      node.classList.toggle("is-obstacle", tile.type === "obstacle");
      node.classList.toggle("is-origin", game.origin?.x === x && game.origin?.y === y);
      node.classList.toggle("is-destination", game.path.length > 1 && destination?.x === x && destination?.y === y);
      node.classList.toggle("is-path", game.pathKeys.has(tileKey));
      node.classList.toggle("is-collecting", game.collecting.has(tile.id));
      node.classList.toggle("is-exploding", game.exploding.has(tileKey));
      node.classList.toggle("is-new", tile.fresh);
      node.classList.toggle("is-pop", game.popped === tile.id);
      if (tile.type !== "obstacle") tile.fresh = false;
    }
  }

  for (const [id, node] of tileNodes) {
    if (!seen.has(id)) {
      node.remove();
      tileNodes.delete(id);
    }
  }
}

export function resetRenderer() {
  tileNodes.clear();
}

export function burst(ui, pos) {
  const fx = document.createElement("span");
  fx.className = "fx";
  fx.style.setProperty("--x", pos.x);
  fx.style.setProperty("--y", pos.y);
  ui.board.append(fx);
  fx.addEventListener("animationend", () => fx.remove(), { once: true });
}

export function shockwave(ui, pos) {
  const fx = document.createElement("span");
  fx.className = "fx fx-shock";
  fx.style.setProperty("--x", pos.x);
  fx.style.setProperty("--y", pos.y);
  ui.board.append(fx);
  fx.addEventListener("animationend", () => fx.remove(), { once: true });
}
