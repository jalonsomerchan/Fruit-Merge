import { existsSync, cpSync, copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";

function copyIfExists(from, to) {
  if (!existsSync(from)) {
    return;
  }

  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

function copyDirectoryIfExists(from, to) {
  if (!existsSync(from)) {
    return;
  }

  cpSync(from, to, { recursive: true });
}

function fruitMergeStaticAssets() {
  return {
    name: "fruit-merge-static-assets",
    closeBundle() {
      const root = process.cwd();
      const dist = resolve(root, "dist");

      copyDirectoryIfExists(resolve(root, "images/icons"), resolve(dist, "images/icons"));
      copyIfExists(resolve(root, "CNAME"), resolve(dist, "CNAME"));
    }
  };
}

export default defineConfig({
  base: "/",
  plugins: [fruitMergeStaticAssets()]
});
