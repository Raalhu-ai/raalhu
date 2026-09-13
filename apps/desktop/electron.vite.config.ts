import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import path from "path";

const releaseApiBase = process.env.RAALHU_RELEASE_API_BASE?.trim() || '';
if (process.env.RAALHU_RELEASE_BUILD === '1') {
  const url = new URL(releaseApiBase);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== '/') {
    throw new Error('RAALHU_RELEASE_API_BASE must be a public HTTPS origin without credentials, a path, query, or fragment.');
  }
}

export default defineConfig({
  main: {
    define: { __RAALHU_RELEASE_API_BASE__: JSON.stringify(releaseApiBase) },
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
