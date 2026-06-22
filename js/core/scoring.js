import { powerFor } from "./config.js";

export function mergeScore(level) {
  return 25 * powerFor(level);
}
