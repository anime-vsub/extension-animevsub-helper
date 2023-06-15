// eslint-disable-next-line n/no-unsupported-features/node-builtins
import fs from "fs/promises"

import { defineConfig } from "tsup"
import Yaml from "yaml"

import { isDev } from "./scripts/utils"

export default defineConfig(() => ({
  esbuildPlugins: [{
    name: "yaml",
    setup(build) {
      build.onLoad({ filter: /\.ya?ml$/ }, async ({ path }) => {
        const text = await fs.readFile(path, "utf8")

        return {
          contents: JSON.stringify(Yaml.parse(text)),
          loader: "json"
        }
      })
    }
  }],
  entry: {
    "background/index": "./src/background/index.ts",
    ...(isDev ? { mv3client: "./scripts/client.ts" } : {})
  },
  outDir: "extension/dist",
  format: ["esm"],
  target: "esnext",
  ignoreWatch: ["**/extension/**"],
  splitting: true,
  sourcemap: isDev ? "inline" : false,
  define: {
    __DEV__: JSON.stringify(isDev),
    __MV3__: JSON.stringify(true)
  },
  treeshaking: true,
}))
