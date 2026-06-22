import { powerFor, spriteFor } from "../core/config.js";

const tileNodes = new Map();

function key(pos) {
  return `${pos.x},${pos.y}`;
}

export function renderStats(ui, game) {
  ui.score.textContent = game.score.toLocaleString("es-ES");
  ui.best.textContent = game.best.toLocaleString("es-ES");
  ui.moves.textContent = game.moves.toString();
}

export function renderBoard(ui, game) {
  const seen = new Set();
  ui.board.style.setProperty("--size", game.size);

  for (let y = 0; y < game.size; y += 1) {
    for (let x = 0; x < game.size; x += 1) {
      const tile = game.board[y][x];
      if (!tile) continue;

      seen.add(tile.id);
      let node = tileNodes.get(tile.id);
      if (!node) {
        node = document.createElement("button");
        node.className = "tile";
        node.type = "button";
        node.innerHTML = "<img alt=\"\" draggable=\"false\" />";
        ui.board.append(node);
        tileNodes.set(tile.id, node);
      }

      node.dataset.pos = key({ x, y });
      node.dataset.level = Math.min(tile.level, 7).toString();
      node.dataset.power = powerFor(tile.level);
      node.dataset.order = game.pathKeys.get(key({ x, y })) ?? "";
      node.style.setProperty("--x", x);
      node.style.setProperty("--y", y);
      node.style.setProperty("--to-x", game.collecting.get(tile.id)?.x ?? 0);
      node.style.setProperty("--to-y", game.collecting.get(tile.id)?.y ?? 0);
      node.querySelector("img").src = spriteFor(tile);
      node.ariaLabel = `${tile.fruit} x${powerFor(tile.level)}`;
      node.classList.toggle("is-origin", game.origin?.x === x && game.origin?.y === y);
      node.classList.toggle("is-path", game.pathKeys.has(key({ x, y })));
      node.classList.toggle("is-collecting", game.collecting.has(tile.id));
      node.classList.toggle("is-exploding", game.exploding.has(key({ x, y })));
      node.classList.toggle("is-new", tile.fresh);
      node.classList.toggle("is-pop", game.popped === tile.id);
      tile.fresh = false;
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
