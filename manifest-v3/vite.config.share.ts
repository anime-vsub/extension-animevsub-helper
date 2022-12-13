/// <reference types="vitest" />

import type { UserConfig } from "vite"
import yaml from "@modyfi/vite-plugin-yaml"

import { isDev, r } from "./scripts/utils"

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
    yaml()
  ]
}
