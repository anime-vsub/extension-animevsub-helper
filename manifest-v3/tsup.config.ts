import { defineConfig } from "tsup"
import yaml from 'esbuild-plugin-yaml-import';

import { isDev } from "./scripts/utils"
import Yaml from "yaml"
import fs from "fs/promises"

export default defineConfig(() => ({
  esbuildPlugins: [{
    name: 'yaml',
    setup(build) {
      build.onLoad({ filter: /\.ya?ml$/ }, async ({ path }) => {
        const text = await fs.readFile(path, "utf8")
        
        return {
          contents: JSON.stringify(Yaml.parse(text)),
          loader: "json"
        }
      })
    },
  }],
  entry: {
    "background/index": "./src/background/index.ts",
    ...(isDev ? { mv3client: "./scripts/client.ts" } : {})
  },
  outDir: "extension/dist",
  format: ["esm"],
  target: "esnext",
  ignoreWatch: ["**/extension/**"],
  splitting: false,
  sourcemap: isDev ? "inline" : false,
  define: {
    __DEV__: JSON.stringify(isDev)
  },
  treeshaking: true,
  minify: !isDev
}))
