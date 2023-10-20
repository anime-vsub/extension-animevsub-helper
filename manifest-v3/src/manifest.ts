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
    manifest_version: 3,
    name: pkg.displayName || pkg.name,
    version: pkg.version,
    description: pkg.description,
    background: {
      service_worker: "./dist/background/index.mjs"
    },
    icons: {
      16: "./assets/icon-512.png",
      48: "./assets/icon-512.png",
      128: "./assets/icon-512.png"
    },
    permissions: ["activeTab", "scripting", "cookies", "declarativeNetRequest", "storage"],
    host_permissions: ["*://*/*"],
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
    ],
    content_security_policy: {
      extension_pages: isDev
        ? `script-src 'self' http://localhost:${port}; object-src 'self' http://localhost:${port}`
        : "script-src 'self'; object-src 'self'"
    }
  }

  if (isDev) {
    // for content script, as browsers will cache them for each reload,
    // we use a background script to always inject the latest version
    // see src/background/contentScriptHMR.ts
    // delete manifest.content_scripts

    manifest.permissions?.push("webNavigation")
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any
    ;(manifest.background as unknown as any)!.type = "module"
  }

  return manifest
}
