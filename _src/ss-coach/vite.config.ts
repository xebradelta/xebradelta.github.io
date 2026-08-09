import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Emits sw.js into the build output with the precache manifest injected.
 * The service worker template lives in sw/sw.template.js and contains the
 * placeholder __PRECACHE_MANIFEST__. All paths are relative so the app can
 * be mounted at any base path.
 */
function serviceWorker(): Plugin {
  return {
    name: "ss-coach-sw",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter(
        (f) => !f.endsWith(".map") && f !== "sw.js"
      );
      const extra = [
        "./",
        "index.html",
        "manifest.webmanifest",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-maskable-512.png",
        "icons/apple-touch-icon.png",
      ];
      const manifest = JSON.stringify([...extra, ...assets]);
      const template = readFileSync(
        resolve(__dirname, "sw/sw.template.js"),
        "utf8"
      );
      const version = `ss-coach-${Date.now().toString(36)}`;
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: template
          .replace("__PRECACHE_MANIFEST__", manifest)
          .replace("__CACHE_VERSION__", version),
      });
    },
  };
}

export default defineConfig({
  // Relative base: works at xebradelta.github.io/ss/, on a project page,
  // or anywhere else without configuration.
  base: "./",
  plugins: [react(), serviceWorker()],
  build: {
    outDir: "../../ss",
    emptyOutDir: true,
    sourcemap: false,
  },
});
