import { defineConfig } from "vite";
import { nodeResolve } from "@rollup/plugin-node-resolve";
const { resolve } = require("path");

const root = resolve(__dirname, "src");

export default defineConfig({
  root,
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/"),
    },
  },
  plugins: [
    nodeResolve({
      extensions: [".js", ".ts"],
    }),
  ],
  build: {
    outDir: "dist",
    sourceMap: true,
    manifest: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/index.html"),
      },
    },
  },
  server: {
    port: 9090,
  },
});
