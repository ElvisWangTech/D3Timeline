import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "D3Timeline",
      fileName: (format) => `index.${format}.js`,
    },
    minify: "esbuild",
    // 其他优化
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
  },
  server: {
    open: "/example/index.html",
  },
});
