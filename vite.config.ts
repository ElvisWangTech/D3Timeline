import { defineConfig } from "vite";
import vitePluginBundleObfuscator from "vite-plugin-bundle-obfuscator";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    vitePluginBundleObfuscator({
      enable: true,
      autoExcludeNodeModules: true,
      threadPool: true,
      options: {
        compact: true,
        controlFlowFlattening: true,
        selfDefending: true,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayCallsTransformThreshold: 0.5,
        stringArrayEncoding: [],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 1,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 2,
        stringArrayWrappersType: "variable",
        stringArrayThreshold: 0.75,
        simplify: true,
      },
    }),
  ],
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
