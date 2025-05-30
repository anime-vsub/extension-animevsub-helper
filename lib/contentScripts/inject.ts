/* eslint-disable no-undef */
/// <reference lib="dom" />

import browser from "webextension-polyfill"

// document.documentElement.innerHTML = "<head></head>"
document.querySelectorAll("script").forEach((script) => script.remove())

if (!location.href.includes("animevsub.eu.org")) {
  const script = document.createElement("script")
  document.documentElement.prepend(script)
  script.src = browser.runtime.getURL("dist/contentScripts/inject2.global.js")
}
