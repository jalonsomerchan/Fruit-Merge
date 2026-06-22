export function choice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}
