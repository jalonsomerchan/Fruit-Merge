export const FRUITS = [
  { id: "cherry", name: "Cereza", row: 0 },
  { id: "strawberry", name: "Fresa", row: 1 },
  { id: "orange", name: "Naranja", row: 2 },
  { id: "watermelon", name: "Sandia", row: 3 },
  { id: "grape", name: "Uva", row: 4 },
  { id: "banana", name: "Platano", row: 5 }
];

export const MAX_SPRITE_LEVEL = 3;
export const MAX_MERGE_LEVEL = 7;
export const START_SIZE = 8;
export const STORAGE_KEY = "fruitMergeBest";
export const MOVE_DELAY = 235;
export const MERGE_DELAY = 300;

export function spriteFor(tile) {
  const fruit = FRUITS.find((item) => item.id === tile.fruit);
  const col = Math.min(tile.level, MAX_SPRITE_LEVEL);
  return `/assets/sprites/fruits/fruit-${fruit.row * 4 + col + 1}.png`;
}

export function powerFor(level) {
  return 2 ** level;
}
