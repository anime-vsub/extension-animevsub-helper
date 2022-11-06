// generate stub index.html files for dev entry
import { execSync } from "child_process"

import chokidar from "chokidar"
import fs from "fs-extra"

import { isDev, log, port, r } from "./utils"

/**
 * Stub index.html to use Vite in development
 */
async function stubIndexHtml() {
  const views = [
    "background"
  ]

  for (const view of views) {
    await fs.ensureDir(r(`extension/dist/${view}`))
    let data = await fs.readFile(r(`src/${view}/index.html`), "utf-8")
    data = data
      .replace("\"./main.ts\"", `"http://localhost:${port}/${view}/main.ts"`)
      .replace("<div id=\"app\"></div>", "<div id=\"app\">Vite server did not start</div>")
    await fs.writeFile(r(`extension/dist/${view}/index.html`), data, "utf-8")
    log("PRE", `stub ${view}`)
  }
}

function writeManifest() {
  execSync("npx tsx ./scripts/manifest.ts", { stdio: "inherit" })
}

fs.copySync(r("../lib/assets"), r("extension/assets"))
writeManifest()

if (isDev) {
  stubIndexHtml()
  chokidar.watch(r("src/**/*.html"))
    .on("change", () => {
      stubIndexHtml()
    })
  chokidar.watch([r("src/manifest.ts"), r("package.json")])
    .on("change", () => {
      writeManifest()
    })
}
