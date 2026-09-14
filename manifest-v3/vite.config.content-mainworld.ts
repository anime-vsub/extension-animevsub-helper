import { defineConfig } from "vite"

import packageJson from "./package.json"
import { isDev, r } from "./scripts/utils"
import { sharedConfig } from "./vite.config.share"

// bundling the main world content script using Vite
export default defineConfig({
  ...sharedConfig,
  build: {
    watch: isDev
      ? {}
      : undefined,
    outDir: r("extension/dist/contentScripts"),
    cssCodeSplit: false,
    emptyOutDir: false,
    sourcemap: isDev ? "inline" : false,
    lib: {
      entry: r("src/contentScripts/mainworld.ts"),
      name: packageJson.name,
      formats: ["iife"]
    },
    rollupOptions: {
      output: {
        entryFileNames: "mainworld.global.js",
        extend: true
      }
    }
  }
})
