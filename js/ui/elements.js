export function qs(selector) {
  return document.querySelector(selector);
}

export const ui = {
  screens: [...document.querySelectorAll("[data-screen]")],
  startGame: qs("#start-game"),
  board: qs("#board"),
  score: qs("#score"),
  best: qs("#best"),
  moves: qs("#moves"),
  status: qs("#status"),
  modeLabel: qs("#mode-label"),
  modeTimer: qs("#mode-timer"),
  restart: qs("#restart"),
  changeLevel: qs("#change-level"),
  changeMode: qs("#change-mode"),
  menuToggle: qs("#menu-toggle"),
  menuPanel: qs("#menu-panel"),
  variantButtons: [...document.querySelectorAll("[data-variant]")],
  modeButtons: [...document.querySelectorAll("[data-mode]")],
  levelButtons: [...document.querySelectorAll("[data-size]")],
  dialog: qs("#game-over"),
  finalScore: qs("#final-score"),
  playAgain: qs("#play-again")
};
