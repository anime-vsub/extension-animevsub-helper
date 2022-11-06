// generate stub index.html files for dev entry
import { execSync } from "child_process"

import chokidar from "chokidar"
import fs from "fs-extra"

import { isDev, r } from "./utils"

function writeManifest() {
  execSync("npx tsx ./scripts/manifest.ts", { stdio: "inherit" })
}

fs.ensureDirSync(r("extension"))
fs.copySync(r("../lib/assets"), r("extension/assets"))
writeManifest()

if (isDev) {
  chokidar.watch([r("src/manifest.ts"), r("package.json")])
    .on("change", () => {
      writeManifest()
    })
}
