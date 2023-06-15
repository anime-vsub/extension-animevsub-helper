/// <reference types="vitest" />

import yaml from "@modyfi/vite-plugin-yaml"
import type { UserConfig } from "vite"

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
    __DEV__: isDev,
    __MV3__: JSON.stringify(true)
  },
  plugins: [
    yaml()
  ]
}
