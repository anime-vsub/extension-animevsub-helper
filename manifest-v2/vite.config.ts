/// <reference types="vitest" />

import { dirname, relative } from "path"

import type { UserConfig } from "vite"
import { defineConfig } from "vite"

import { isDev, port, r } from "./scripts/utils"

export const sharedConfig: UserConfig = {
  root: r("src"),
  resolve: {
    alias: {
      "~/": `${r("src")}/`,
      "lib/": `${r("../lib")}/`
    }
  },
  define: {
    __DEV__: isDev
  },
  plugins: [
    // rewrite assets to use relative path
    {
      name: "assets-rewrite",
      enforce: "post",
      apply: "build",
      transformIndexHtml(html, { path }) {
        return html.replace(/"\/assets\//g, `"${relative(dirname(path), "/assets")}/`)
      }
    }
  ]
}

export default defineConfig(({ command }) => ({
  ...sharedConfig,
  base: command === "serve" ? `http://localhost:${port}/` : "/dist/",
  server: {
    port,
    hmr: {
      host: "localhost"
    }
  },
  build: {
    outDir: r("extension/dist"),
    emptyOutDir: false,
    sourcemap: isDev ? "inline" : false,
    // https://developer.chrome.com/docs/webstore/program_policies/#:~:text=Code%20Readability%20Requirements
    terserOptions: {
      mangle: false
    },
    rollupOptions: {
      input: {
        background: r("src/background/index.html")
      }
    }
  },
  plugins: sharedConfig.plugins,
  test: {
    globals: true,
    environment: "jsdom"
  }
}))
