function posFromElement(element) {
  const tile = element?.closest(".tile");
  if (!tile) return null;
  const [x, y] = tile.dataset.pos.split(",").map(Number);
  return { x, y };
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

export function bindInput(ui, game, handlers) {
  let pointerDown = false;
  let activeNode = null;
  let lastPos = null;

  ui.board.addEventListener("pointerdown", (event) => {
    const pos = posFromEvent(event);
    if (!pos || game.locked) return;

    pointerDown = true;
    lastPos = pos;
    activeNode = event.target.closest(".tile");
    activeNode.setPointerCapture(event.pointerId);
    activeNode.classList.add("is-touching");
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
    cleanupTouch();
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
