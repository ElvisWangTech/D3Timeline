import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: "example",
  base: "./",
  build: {
    outDir: "../dist-example",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.html"),
    },
    sourcemap: true,
  },
  resolve: {
    alias: {
      "../src": resolve(__dirname, "..", "src"),
      "/src": resolve(__dirname, "..", "src"),
    },
  },
});
