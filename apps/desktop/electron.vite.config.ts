import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  main: {
    build: {
      outDir: "dist/main",
      rollupOptions: { external: ["better-sqlite3"], output: { entryFileNames: "[name].js" } },
      lib: {
        entry: { main: "src/main.ts", "storage-worker": "src/storage/worker.ts" },
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
        "@raalhu/shared/src/agent": path.resolve(__dirname, "../../packages/shared/src/agent"),
        "@raalhu/shared/src/api-core": path.resolve(__dirname, "../../packages/shared/src/api-core"),
        "@raalhu/shared/src": path.resolve(__dirname, "../../packages/shared/src"),
        "@raalhu/shared": path.resolve(__dirname, "../../packages/shared/src"),
        "@raalhu/ui": path.resolve(__dirname, "../../packages/ui/src"),
        "react-native": path.resolve(__dirname, "node_modules/react-native-web"),
      },
    },
    css: {
      postcss: path.resolve(__dirname),
    },
    build: {
      outDir: path.resolve(__dirname, "dist/renderer"),
    },
  },
});
