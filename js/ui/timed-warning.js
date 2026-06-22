const WARNING_THRESHOLD = 3;

function ensureWarningLayer() {
  let layer = document.querySelector("#timed-warning");
  if (layer) return layer;

  layer = document.createElement("div");
  layer.id = "timed-warning";
  layer.className = "timed-warning";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  return layer;
}

function readSeconds(timer) {
  const match = timer?.textContent?.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function isGameVisible() {
  return document.querySelector('[data-screen="game"]')?.classList.contains("is-active");
}

function updateTimedWarning() {
  const layer = ensureWarningLayer();
  const modeLabel = document.querySelector("#mode-label");
  const modeTimer = document.querySelector("#mode-timer");
  const seconds = readSeconds(modeTimer);
  const isTimedMode = modeLabel?.textContent?.toLowerCase().includes("contrarreloj");
  const shouldShow = isTimedMode && isGameVisible() && seconds > 0 && seconds <= WARNING_THRESHOLD;

  layer.classList.toggle("is-visible", shouldShow);
  layer.textContent = shouldShow ? seconds.toString() : "";
}

window.addEventListener("DOMContentLoaded", () => {
  ensureWarningLayer();
  window.setInterval(updateTimedWarning, 80);
});
