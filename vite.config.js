import { defineConfig } from "vite";
import { nodeResolve } from "@rollup/plugin-node-resolve";
const { resolve } = require("path");
import legacy from "@vitejs/plugin-legacy";

const root = resolve(__dirname, "src");

export default defineConfig({
  root,
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/"),
    },
  },
  plugins: [
    legacy(),
    nodeResolve({
      extensions: [".js", ".ts"],
    }),
  ],
  build: {
    outDir: "../dist",
    sourceMap: true,
    manifest: true,
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        resume: resolve(root, "resume", "index.html"),
      },
    },
  },
  server: {
    port: 9090,
  },
});
