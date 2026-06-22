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

const FRUIT_SPRITES = import.meta.glob("../../assets/sprites/fruits/fruit-*.png", {
  eager: true,
  query: "?url",
  import: "default"
});

export function spriteFor(tile) {
  const fruit = FRUITS.find((item) => item.id === tile.fruit);
  const col = Math.min(tile.level, MAX_SPRITE_LEVEL);
  const spriteIndex = fruit.row * 4 + col + 1;
  return FRUIT_SPRITES[`../../assets/sprites/fruits/fruit-${spriteIndex}.png`];
}

export function powerFor(level) {
  return 2 ** level;
}
