/* eslint-disable no-undef */
/// <reference lib="dom" />

import browser from "webextension-polyfill"

if (!location.href.includes("animevsub.eu.org")) {
  document.querySelectorAll("script").forEach((script) => script.remove())

  const script = document.createElement("script")
  document.documentElement.prepend(script)
  script.src = browser.runtime.getURL("dist/contentScripts/inject2.global.js")
}
