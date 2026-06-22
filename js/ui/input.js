function posFromElement(element) {
  const tile = element?.closest(".tile");
  if (!tile) return null;
  const [x, y] = tile.dataset.pos.split(",").map(Number);
  return { x, y };
}

function samePos(a, b) {
  return a?.x === b?.x && a?.y === b?.y;
}

function posFromBoardPoint(board, game, clientX, clientY) {
  const rect = board.getBoundingClientRect();
  if (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  ) {
    return null;
  }

  const cellSize = rect.width / game.size;
  const x = Math.min(game.size - 1, Math.max(0, Math.floor((clientX - rect.left) / cellSize)));
  const y = Math.min(game.size - 1, Math.max(0, Math.floor((clientY - rect.top) / cellSize)));
  return { x, y };
}

function posFromEvent(event) {
  return posFromElement(event.target);
}

function tileNodeFromPos(board, pos) {
  return board.querySelector(`.tile[data-pos="${pos.x},${pos.y}"]`);
}

export function bindInput(ui, game, handlers) {
  let pointerDown = false;
  let activeNode = null;
  let lastPos = null;

  ui.board.addEventListener("pointerdown", (event) => {
    const pos =
      posFromBoardPoint(ui.board, game, event.clientX, event.clientY) ??
      posFromEvent(event);
    if (!pos || game.locked) return;

    if (game.variant === "match3" && game.swapFrom && !samePos(game.swapFrom, pos)) {
      handlers.end(pos);
      return;
    }

    pointerDown = true;
    lastPos = pos;
    activeNode = tileNodeFromPos(ui.board, pos) ?? event.target.closest(".tile");
    activeNode?.setPointerCapture(event.pointerId);
    activeNode?.classList.add("is-touching");
    handlers.start(pos);
  });

  ui.board.addEventListener("pointermove", (event) => {
    if (!pointerDown || game.locked) return;
    const pos =
      posFromBoardPoint(ui.board, game, event.clientX, event.clientY) ??
      posFromElement(document.elementFromPoint(event.clientX, event.clientY));
    if (pos) {
      lastPos = pos;
      handlers.move(pos);
    }
  });

  ui.board.addEventListener("pointerup", (event) => {
    if (!pointerDown) return;
    const pos =
      posFromBoardPoint(ui.board, game, event.clientX, event.clientY) ??
      posFromElement(document.elementFromPoint(event.clientX, event.clientY)) ??
      lastPos;

    const keepMatch3Selection = game.variant === "match3" && game.swapFrom && samePos(game.swapFrom, pos);
    cleanupTouch();

    if (keepMatch3Selection) {
      return;
    }

    handlers.end(pos);
  });

  ui.board.addEventListener("pointercancel", () => {
    cleanupTouch();
    handlers.cancel();
  });

  function cleanupTouch() {
    pointerDown = false;
    lastPos = null;
    activeNode?.classList.remove("is-touching");
    activeNode = null;
  }
}
