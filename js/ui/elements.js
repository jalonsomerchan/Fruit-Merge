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
  restart: qs("#restart"),
  changeLevel: qs("#change-level"),
  menuToggle: qs("#menu-toggle"),
  menuPanel: qs("#menu-panel"),
  levelButtons: [...document.querySelectorAll("[data-size]")],
  dialog: qs("#game-over"),
  finalScore: qs("#final-score"),
  playAgain: qs("#play-again")
};
