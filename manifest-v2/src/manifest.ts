import fs from "fs-extra"
import type { Manifest } from "webextension-polyfill"
import Yaml from "yaml"

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
    browser_specific_settings: {
      gecko: {
        id: "26005fb7-3d84-4144-a688-a058944123b3",
        strict_min_version: "79.0"
      }
    },
    permissions: [
      "activeTab",
      "http://*/",
      "https://*/",
      "cookies",
      "webRequest",
      "webRequestBlocking"
    ],
    content_scripts: [
      {
        matches: Yaml.parse(await fs.readFile(r("../allowlist.yaml"), "utf8"))
          .hosts.map((host) => {
            return [`http://${host}/*`, `https://${host}/*`]
          })
          .flat(1),
        all_frames: true,
        run_at: "document_start",
        js: ["./dist/contentScripts/index.global.js"]
      }
    ]
  }

  if (isDev) {
    // for content script, as browsers will cache them for each reload,
    // we use a background script to always inject the latest version
    // see src/background/contentScriptHMR.ts

    delete manifest.content_scripts

    manifest.permissions?.push("webNavigation")

    // this is required on dev for Vite script to load
    // eslint-disable-next-line no-useless-escape
    manifest.content_security_policy = `script-src \'self\' http://localhost:${port}; object-src \'self\'`
  }

  return manifest
}
