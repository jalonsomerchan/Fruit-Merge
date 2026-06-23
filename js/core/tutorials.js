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
  "C O G S B C O G",
  "S G B O C S G B",
  "O C S G B O C S",
  "G B O C C G B O",
  "B S C G O B S C",
  "C O B S G C O B",
  "S G C O B S G C",
  "O B S C G O B S"
]);

const MERGE_CHAIN_BOARD = () => boardFrom([
  "C O G S B C O G",
  "S G B O C S G B",
  "O C C G B O C S",
  "G B O C S G B O",
  "B S C G C B S C",
  "C O B S G C O B",
  "S G C O B S G C",
  "O B S C G O B S"
]);

const MERGE_OBSTACLE_BOARD = () => boardFrom([
  "C O G S B C O G",
  "S G B O C S G B",
  "O C S G B O C S",
  "G B X C C G B O",
  "B S C G O B S C",
  "C O B S G C O B",
  "S G C O B S G C",
  "O B S C G O B S"
]);

const MERGE_CLEANUP_BOARD = () => boardFrom([
  ". . . . . . . .",
  ". . . . . . . .",
  ". . . . . . . .",
  ". . . . . . . .",
  ". . C C C . . .",
  ". . . . . . . .",
  ". . . . . . . .",
  ". . . . . . . ."
]);

const MATCH3_ROW_BOARD = () => boardFrom([
  "C O G S B C O G",
  "S G B O C S G B",
  "O C S G B O C S",
  "G B O C S G B O",
  "B S C G C B S C",
  "C O B S G C O B",
  "S G C O B S G C",
  "O B S C G O B S"
]);

const MATCH3_COLUMN_BOARD = () => boardFrom([
  "C O G S B C O G",
  "S G B O C S G B",
  "O C S C B O C S",
  "G B O G C G B O",
  "B S C C O B S C",
  "C O B S G C O B",
  "S G C O B S G C",
  "O B S C G O B S"
]);

const MATCH3_OBSTACLE_BOARD = () => boardFrom([
  "C O G S B C O G",
  "S G B O C S G B",
  "O C S G B O C S",
  "G B O C S G B O",
  "B S C G C X S C",
  "C O B S G C O B",
  "S G C O B S G C",
  "O B S C G O B S"
]);

const MATCH3_CLEANUP_BOARD = () => boardFrom([
  ". . . . . . . .",
  ". . . . . . . .",
  ". . . . . . . .",
  ". . . C . . . .",
  ". . C G C . . .",
  ". . . . . . . .",
  ". . . . . . . .",
  ". . . . . . . ."
]);

const MODE_LESSONS = {
  normal: {
    merge: "Modo Normal no tiene presion extra. Aprende a unir frutas iguales y a decidir donde acaba la fusion.",
    match3: "Modo Normal no tiene presion extra. Aprende a intercambiar dos frutas vecinas para crear lineas de 3 o mas."
  },
  timed: {
    merge: "Contrarreloj reinicia el contador solo con una fusion valida. Mirar rapido, unir rapido.",
    match3: "Contrarreloj reinicia el contador solo con un intercambio valido. Si no crea linea, no cuenta."
  },
  explosive: {
    merge: "Explosivo limpia una zona cada pocos segundos en partida real. Conviene hacer jugadas antes de que cambie el tablero.",
    match3: "Explosivo limpia una zona cada pocos segundos en partida real. Forma lineas antes de perder piezas clave."
  },
  simple: {
    merge: "Simple no sube fruta de nivel: las frutas usadas desaparecen y entran nuevas. Piensa en abrir huecos.",
    match3: "Simple resuelve solo la linea creada. No hay cascadas largas, asi que cada intercambio debe valer por si mismo."
  },
  limited: {
    merge: "Movimientos limitados cuenta cada fusion valida. Una cadena larga vale mas que muchas fusiones pequenas.",
    match3: "Movimientos limitados cuenta cada intercambio valido. Busca lineas grandes antes de gastar movimiento."
  },
  obstacles: {
    merge: "Obstaculos mete rocas. No se tocan: crea un hueco junto a ellas y la gravedad las rompe.",
    match3: "Obstaculos mete rocas. No se intercambian: crea una linea junto a ellas para abrir hueco y romperlas."
  },
  cleanup: {
    merge: "Limpieza no rellena el tablero. Cada fruta que quitas se va para siempre: objetivo, vaciar lo maximo posible.",
    match3: "Limpieza no rellena el tablero. Cada linea elimina fruta para siempre: piensa antes de cerrar caminos."
  }
};

const MODE_NAMES = {
  normal: "Normal",
  timed: "Contrarreloj",
  explosive: "Explosivo",
  simple: "Simple",
  limited: "Movimientos limitados",
  obstacles: "Obstaculos",
  cleanup: "Limpieza"
};

function makeStep({ board, title, body, instruction, action }) {
  return {
    board,
    title,
    body,
    instruction,
    message: `${title}. ${instruction}`,
    action
  };
}

function mergeSteps(mode) {
  if (mode === "cleanup") {
    return [
      makeStep({
        board: MERGE_CLEANUP_BOARD,
        title: "Limpieza: quitar sin rellenar",
        body: MODE_LESSONS.cleanup.merge,
        instruction: "Arrastra las tres cerezas del centro. Al soltar, desaparecen y no cae fruta nueva.",
        action: { type: "merge", path: [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }] }
      }),
      makeStep({
        board: MERGE_PAIR_BOARD,
        title: "Limpieza: conservar opciones",
        body: "Cada fusion limpia casillas. Si limpias sin plan, puedes dejar frutas aisladas sin pareja.",
        instruction: "Une las dos cerezas iluminadas del centro para practicar una limpieza corta.",
        action: { type: "merge", path: [{ x: 3, y: 3 }, { x: 4, y: 3 }] }
      })
    ];
  }

  if (mode === "obstacles") {
    return [
      makeStep({
        board: MERGE_OBSTACLE_BOARD,
        title: "Obstaculos: abrir hueco",
        body: MODE_LESSONS.obstacles.merge,
        instruction: "Fusiona las dos cerezas junto a la roca. La fusion deja un hueco y la roca se rompe al caer.",
        action: { type: "merge", path: [{ x: 3, y: 3 }, { x: 4, y: 3 }] }
      }),
      makeStep({
        board: MERGE_CHAIN_BOARD,
        title: "Obstaculos: rutas flexibles",
        body: "Las cadenas pueden ir en horizontal, vertical o diagonal. Rodea bloqueos buscando frutas iguales adyacentes.",
        instruction: "Une la diagonal completa de cuatro cerezas iluminadas.",
        action: { type: "merge", path: [{ x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 5 }] }
      })
    ];
  }

  return [
    makeStep({
      board: MERGE_PAIR_BOARD,
      title: `${MODE_NAMES[mode] ?? "Normal"}: fusion basica`,
      body: MODE_LESSONS[mode]?.merge ?? MODE_LESSONS.normal.merge,
      instruction: "Arrastra desde la cereza verde hasta la otra cereza iluminada. La ultima casilla recibe la fusion.",
      action: { type: "merge", path: [{ x: 3, y: 3 }, { x: 4, y: 3 }] }
    }),
    makeStep({
      board: MERGE_CHAIN_BOARD,
      title: "Cadenas: mas fruta, mas potencia",
      body: "Puedes encadenar mas de dos frutas iguales si son adyacentes. Diagonal tambien cuenta.",
      instruction: "Sigue los numeros y une las cuatro cerezas. Soltar en la ultima crea una fruta mas potente.",
      action: { type: "merge", path: [{ x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 5 }] }
    })
  ];
}

function match3Steps(mode) {
  if (mode === "cleanup") {
    return [
      makeStep({
        board: MATCH3_CLEANUP_BOARD,
        title: "Match 3 limpieza: linea que no rellena",
        body: MODE_LESSONS.cleanup.match3,
        instruction: "Baja la cereza iluminada para formar tres cerezas en fila. Esa linea desaparece para siempre.",
        action: { type: "swap", from: { x: 3, y: 3 }, to: { x: 3, y: 4 } }
      }),
      makeStep({
        board: MATCH3_ROW_BOARD,
        title: "Match 3 limpieza: no cerrar caminos",
        body: "El tablero fijo ayuda a ver rutas. En partida real de limpieza, cada linea reduce opciones futuras.",
        instruction: "Repite el intercambio vertical iluminado para crear una linea horizontal de tres.",
        action: { type: "swap", from: { x: 3, y: 3 }, to: { x: 3, y: 4 } }
      })
    ];
  }

  if (mode === "obstacles") {
    return [
      makeStep({
        board: MATCH3_OBSTACLE_BOARD,
        title: "Match 3 obstaculos: linea junto a roca",
        body: MODE_LESSONS.obstacles.match3,
        instruction: "Baja la cereza iluminada para crear una linea junto a la roca. El hueco la rompe al resolver.",
        action: { type: "swap", from: { x: 3, y: 3 }, to: { x: 3, y: 4 } }
      }),
      makeStep({
        board: MATCH3_COLUMN_BOARD,
        title: "Match 3 obstaculos: mirar vertical",
        body: "No busques solo filas. Una columna buena puede abrir zonas que una roca estaba separando.",
        instruction: "Mueve la cereza de la derecha al centro para crear una linea vertical.",
        action: { type: "swap", from: { x: 4, y: 3 }, to: { x: 3, y: 3 } }
      })
    ];
  }

  return [
    makeStep({
      board: MATCH3_ROW_BOARD,
      title: `Match 3 ${MODE_NAMES[mode] ?? "Normal"}: intercambio valido`,
      body: MODE_LESSONS[mode]?.match3 ?? MODE_LESSONS.normal.match3,
      instruction: "Toca la cereza verde y despues la otra casilla iluminada. Deben quedar tres cerezas en fila.",
      action: { type: "swap", from: { x: 3, y: 3 }, to: { x: 3, y: 4 } }
    }),
    makeStep({
      board: MATCH3_COLUMN_BOARD,
      title: "Match 3: filas y columnas",
      body: "Un intercambio valido puede crear filas o columnas. Si no crea linea, el juego lo deshace.",
      instruction: "Mueve la cereza de la derecha al centro para crear una linea vertical.",
      action: { type: "swap", from: { x: 4, y: 3 }, to: { x: 3, y: 3 } }
    })
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

function samePath(a, b) {
  if (a.length !== b.length) return false;
  return a.every((pos, index) => samePos(pos, b[index]));
}

export function isExpectedMergePath(step, path) {
  if (step?.action?.type !== "merge") return false;
  const expected = step.action.path;
  return samePath(expected, path) || samePath(expected, [...path].reverse());
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

export function tutorialStart(step) {
  if (!step) return null;
  if (step.action.type === "merge") return step.action.path[0];
  if (step.action.type === "swap") return step.action.from;
  return null;
}
