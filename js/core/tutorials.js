const FRUIT_TOKENS = {
  C: "cherry",
  F: "strawberry",
  O: "orange",
  W: "watermelon",
  G: "grape",
  B: "banana",
  S: "strawberry"
};

let tutorialId = 0;

function tile(token, level = 0) {
  if (token === "X") {
    tutorialId += 1;
    return {
      id: `tutorial-obstacle-${tutorialId}`,
      type: "obstacle",
      fresh: false
    };
  }

  if (token === ".") return null;

  tutorialId += 1;
  return {
    id: `tutorial-fruit-${tutorialId}`,
    fruit: FRUIT_TOKENS[token] ?? "cherry",
    level,
    fresh: true
  };
}

function boardFrom(rows, levels = {}) {
  tutorialId += 1;
  return rows.map((row, y) => row.split(" ").map((token, x) => tile(token, levels[`${x},${y}`] ?? 0)));
}

const MERGE_PAIR_BOARD = () => boardFrom([
  "C O G S B",
  "S G B O C",
  "O C S G B",
  "G B O C S",
  "C C G S O"
]);

const MERGE_CHAIN_BOARD = () => boardFrom([
  "C O G S B",
  "S C B O G",
  "O G C S B",
  "G B S C O",
  "B S O G C"
]);

const MERGE_OBSTACLE_BOARD = () => boardFrom([
  "C O G S B",
  "S G B O C",
  "O C S G B",
  "X B O C S",
  "C C G S O"
]);

const MERGE_CLEANUP_BOARD = () => boardFrom([
  ". . . . .",
  ". . . . .",
  ". . . . .",
  ". C C C .",
  ". . . . ."
]);

const MATCH3_ROW_BOARD = () => boardFrom([
  "C O G S B",
  "S G C B O",
  "O C G C B",
  "G B S O C",
  "B S O G S"
]);

const MATCH3_COLUMN_BOARD = () => boardFrom([
  "C O G S B",
  "S G B O C",
  "O S S C B",
  "G B C S O",
  "B S C O G"
]);

const MATCH3_OBSTACLE_BOARD = () => boardFrom([
  "C O G S B",
  "S G C B O",
  "O C G C B",
  "G X S O C",
  "B S O G S"
]);

const MATCH3_CLEANUP_BOARD = () => boardFrom([
  ". . . . .",
  ". S C B .",
  ". O G C .",
  ". C G C .",
  ". . . . ."
]);

const MODE_TIPS = {
  normal: "Aprende la jugada basica y despues prueba cadenas mas largas.",
  timed: "En contrarreloj el contador se reinicia solo cuando haces una jugada valida.",
  explosive: "En explosivo debes moverte rapido porque cada cierto tiempo se limpia una zona.",
  simple: "En simple, las frutas usadas desaparecen: piensa que estas abriendo huecos.",
  limited: "En movimientos limitados cada jugada valida cuenta: busca las mas grandes.",
  obstacles: "En obstaculos, rompe rocas jugando junto a ellas para abrir el tablero.",
  cleanup: "En limpieza no entran frutas nuevas: el objetivo es vaciar el tablero."
};

function mergeSteps(mode) {
  if (mode === "cleanup") {
    return [
      {
        board: MERGE_CLEANUP_BOARD,
        message: "Tutorial limpieza: arrastra las tres cerezas para vaciar esta zona.",
        action: { type: "merge", path: [{ x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }] }
      },
      {
        board: MERGE_PAIR_BOARD,
        message: "Ahora haz una pareja normal: en limpieza desaparecerian y no entrarian frutas nuevas.",
        action: { type: "merge", path: [{ x: 0, y: 4 }, { x: 1, y: 4 }] }
      }
    ];
  }

  if (mode === "obstacles") {
    return [
      {
        board: MERGE_OBSTACLE_BOARD,
        message: "Tutorial obstaculos: fusiona las cerezas junto a la roca para romperla.",
        action: { type: "merge", path: [{ x: 0, y: 4 }, { x: 1, y: 4 }] }
      },
      {
        board: MERGE_CHAIN_BOARD,
        message: "Las diagonales tambien sirven: une esta cadena de cuatro cerezas.",
        action: { type: "merge", path: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }] }
      }
    ];
  }

  return [
    {
      board: MERGE_PAIR_BOARD,
      message: `Tutorial ${MODE_TIPS[mode] ?? "basico"} Arrastra las dos cerezas de abajo de izquierda a derecha.`,
      action: { type: "merge", path: [{ x: 0, y: 4 }, { x: 1, y: 4 }] }
    },
    {
      board: MERGE_CHAIN_BOARD,
      message: "Ahora practica una cadena diagonal de cuatro cerezas para crear una fruta mucho mas potente.",
      action: { type: "merge", path: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }] }
    }
  ];
}

function match3Steps(mode) {
  if (mode === "cleanup") {
    return [
      {
        board: MATCH3_CLEANUP_BOARD,
        message: "Tutorial Match 3 limpieza: intercambia la cereza central derecha con la uva para formar tres cerezas verticales.",
        action: { type: "swap", from: { x: 3, y: 2 }, to: { x: 2, y: 2 } }
      },
      {
        board: MATCH3_ROW_BOARD,
        message: "En limpieza no se rellenaria el tablero. Practica ahora una linea horizontal de tres.",
        action: { type: "swap", from: { x: 2, y: 1 }, to: { x: 2, y: 2 } }
      }
    ];
  }

  if (mode === "obstacles") {
    return [
      {
        board: MATCH3_OBSTACLE_BOARD,
        message: "Tutorial Match 3 obstaculos: no puedes intercambiar rocas; crea la linea de cerezas marcada.",
        action: { type: "swap", from: { x: 2, y: 1 }, to: { x: 2, y: 2 } }
      },
      {
        board: MATCH3_COLUMN_BOARD,
        message: "Ahora crea una linea vertical intercambiando la cereza de la derecha hacia el centro.",
        action: { type: "swap", from: { x: 3, y: 2 }, to: { x: 2, y: 2 } }
      }
    ];
  }

  return [
    {
      board: MATCH3_ROW_BOARD,
      message: `Tutorial Match 3 ${MODE_TIPS[mode] ?? "basico"} Intercambia la cereza de arriba con la uva de abajo para formar tres cerezas en fila.`,
      action: { type: "swap", from: { x: 2, y: 1 }, to: { x: 2, y: 2 } }
    },
    {
      board: MATCH3_COLUMN_BOARD,
      message: "Ahora crea una linea vertical: mueve la cereza de la derecha al centro.",
      action: { type: "swap", from: { x: 3, y: 2 }, to: { x: 2, y: 2 } }
    }
  ];
}

export function createTutorial(variant, mode) {
  const steps = variant === "match3" ? match3Steps(mode) : mergeSteps(mode);
  return {
    current: 0,
    steps
  };
}

export function currentTutorialStep(tutorial) {
  return tutorial?.steps?.[tutorial.current] ?? null;
}

function samePos(a, b) {
  return a?.x === b?.x && a?.y === b?.y;
}

export function isExpectedMergePath(step, path) {
  if (step?.action?.type !== "merge") return false;
  const expected = step.action.path;
  if (expected.length !== path.length) return false;
  return expected.every((pos, index) => samePos(pos, path[index]));
}

export function isExpectedSwap(step, from, to) {
  if (step?.action?.type !== "swap") return false;
  const expected = step.action;
  return (samePos(expected.from, from) && samePos(expected.to, to)) || (samePos(expected.from, to) && samePos(expected.to, from));
}

export function tutorialTargets(step) {
  if (!step) return [];
  if (step.action.type === "merge") return step.action.path;
  if (step.action.type === "swap") return [step.action.from, step.action.to];
  return [];
}
