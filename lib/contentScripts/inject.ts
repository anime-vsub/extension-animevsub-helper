/* eslint-disable no-undef */
/// <reference lib="dom" />

import browser from "webextension-polyfill"

function injectScript(fileName: string) {
  const script = document.createElement("script")
  script.src = browser.runtime.getURL(`dist/contentScripts/${fileName}`)
  script.async = false

  const parent = document.head ?? document.documentElement
  if (parent) {
    parent.prepend(script)
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      ;(document.head ?? document.documentElement)?.prepend(script)
    })
  }
}

document.querySelectorAll("script").forEach((script) => script.remove())

// Embed bridge: exposes window.AnimeVsubEmbed on every page and listens for
// requests inside embedded animevietsub pages.
injectScript("embed.global.js")

if (!location.href.includes("animevsub.eu.org"))
  injectScript("inject2.global.js")
