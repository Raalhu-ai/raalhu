import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  main: {
    build: {
      outDir: "dist/main",
      lib: {
        entry: "src/main.ts",
      },
    },
  },
  preload: {
    build: {
      outDir: "dist/preload",
      lib: {
        entry: "src/preload.ts",
      },
    },
  },
  renderer: {
    root: "src/renderer",
    plugins: [react()],
    publicDir: path.resolve(__dirname, "../../frontend/static"),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src/renderer"),
        "@raalhu/shared": path.resolve(__dirname, "../../packages/shared/src"),
        "@raalhu/ui": path.resolve(__dirname, "../../packages/ui/src"),
        "react-native": path.resolve(__dirname, "node_modules/react-native-web"),
      },
    },
    css: {
      postcss: path.resolve(__dirname),
    },
    build: {
      outDir: "../../dist/renderer",
    },
  },
});
