import fs from "fs-extra"
import type { Manifest } from "webextension-polyfill"

import type PkgType from "../package.json"
import { isDev, port, r } from "../scripts/utils"

export async function getManifest() {
  const pkg = (await fs.readJSON(r("package.json"))) as typeof PkgType

  // update this file to update this manifest.json
  // can also be conditional based on your need
  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 2,
    name: pkg.displayName || pkg.name,
    version: pkg.version,
    description: pkg.description,
    background: {
      page: "./dist/background/index.html",
      persistent: false
    },
    icons: {
      16: "./assets/icon-512.png",
      48: "./assets/icon-512.png",
      128: "./assets/icon-512.png"
    },
    permissions: ["activeTab", "http://*/", "https://*/", "cookies", "webRequest"],
    content_scripts: [
      {
        matches: ["http://*/*", "https://*/*"],
        js: ["./dist/contentScripts/index.global.js"]
      }
    ],
    web_accessible_resources: [
      "dist/contentScripts/style.css",
      "dist/contentScripts/inject.global.js"
    ]
  }

  if (isDev) {
    // for content script, as browsers will cache them for each reload,
    // we use a background script to always inject the latest version
    // see src/background/contentScriptHMR.ts
    // eslint-disable-next-line functional/immutable-data
    delete manifest.content_scripts
    // eslint-disable-next-line functional/immutable-data
    manifest.permissions?.push("webNavigation")

    // this is required on dev for Vite script to load
    // eslint-disable-next-line functional/immutable-data, no-useless-escape
    manifest.content_security_policy = `script-src \'self\' http://localhost:${port}; object-src \'self\'`
  }

  return manifest
}
