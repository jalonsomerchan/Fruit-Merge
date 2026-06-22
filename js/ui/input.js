function posFromElement(element) {
  const tile = element?.closest(".tile");
  if (!tile) return null;
  const [x, y] = tile.dataset.pos.split(",").map(Number);
  return { x, y };
}

function posFromEvent(event) {
  return posFromElement(event.target);
}

export function bindInput(ui, game, handlers) {
  let pointerDown = false;
  let activeNode = null;

  ui.board.addEventListener("pointerdown", (event) => {
    const pos = posFromEvent(event);
    if (!pos || game.locked) return;

    pointerDown = true;
    activeNode = event.target.closest(".tile");
    activeNode.setPointerCapture(event.pointerId);
    activeNode.classList.add("is-touching");
    handlers.start(pos);
  });

  ui.board.addEventListener("pointermove", (event) => {
    if (!pointerDown || game.locked) return;
    const pos = posFromElement(document.elementFromPoint(event.clientX, event.clientY));
    if (pos) handlers.move(pos);
  });

  ui.board.addEventListener("pointerup", () => {
    if (!pointerDown) return;
    cleanupTouch();
    handlers.end();
  });

  ui.board.addEventListener("pointercancel", () => {
    cleanupTouch();
    handlers.cancel();
  });

  function cleanupTouch() {
    pointerDown = false;
    activeNode?.classList.remove("is-touching");
    activeNode = null;
  }
}
