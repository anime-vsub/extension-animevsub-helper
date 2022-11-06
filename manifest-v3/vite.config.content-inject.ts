import { defineConfig } from "vite"

import packageJson from "./package.json"
import { isDev, r } from "./scripts/utils"
import { sharedConfig } from "./vite.config.share"

// bundling the content script using Vite
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
      entry: r("src/contentScripts/inject.ts"),
      name: packageJson.name,
      formats: ["iife"]
    },
    rollupOptions: {
      output: {
        entryFileNames: "inject.global.js",
        extend: true
      }
    }
  }
})
