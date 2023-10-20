import browser from "webextension-polyfill"

import { HASH } from "../../env"
import { addHeader, removeHeader, setHeader } from "../../logic/modify-header"

const storeRulesMV2 = new Map<string, chrome.declarativeNetRequest.Rule[]>()
const ResourceType = {
  XMLHTTPREQUEST: "xmlhttprequest",
  IMAGE: "image",
  MEDIA: "media"
} as const
// eslint-disable-next-line functional/no-let, prefer-const
let registeredMV2 = false

export async function installRules(rules: chrome.declarativeNetRequest.Rule[]) {
  if (__MV3__) {
    const ruleIds = rules.map((item) => item.id)

    const uninstall = () =>
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      })
    await uninstall()
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules
    })

    return uninstall
  } else {
    rules.forEach((rule) => {
      let rules = storeRulesMV2.get(rule.condition.urlFilter!)
      if (!rules) storeRulesMV2.set(rule.condition.urlFilter!, (rules = []))

      rules.push(rule)
    })

    const uninstall = () => {
      rules.forEach((rule) => {
        const rules = storeRulesMV2.get(rule.condition.urlFilter!)
        if (rules) rules.splice(rules.indexOf(rule) >>> 0, 1)
      })
    }

    if (registeredMV2) return uninstall

    const createListener =
      (isResponse: boolean) =>
        (details: browser.WebRequest.OnBeforeSendHeadersDetailsType) => {
          const hash = details.url.slice(details.url.indexOf(HASH) >>> 0)
          if (!hash) return

          const rules = storeRulesMV2.get(hash)
          if (!rules) return

          rules.forEach((rule) => {
            if (rule.action.type !== "modifyHeaders") return

            rule.action[
              isResponse ? "responseHeaders" : "requestHeaders"
            ]?.forEach((headers) => {
              switch (headers.operation) {
                case "remove":
                  removeHeader(details, headers.header, isResponse)
                  break
                case "append":
                  addHeader(details, headers.header, headers.value!, isResponse)
                  break
                case "set":
                default:
                  setHeader(details, headers.header, headers.value!, isResponse)
              }
            })
          })
        }

    browser.webRequest.onBeforeSendHeaders.addListener(
      createListener(false),
      {
        urls: ["<all_urls>"],
        types: [
          ResourceType.XMLHTTPREQUEST,
          ResourceType.IMAGE,
          ResourceType.MEDIA
        ]
      },
      [
        "requestHeaders",
        "blocking"
        // "extraHeaders"
      ]
    )
    browser.webRequest.onHeadersReceived.addListener(
      createListener(true),
      {
        urls: ["<all_urls>"],
        types: [
          ResourceType.XMLHTTPREQUEST,
          ResourceType.IMAGE,
          ResourceType.MEDIA
        ]
      },
      [
        "responseHeaders",
        "blocking"
        // "extraHeaders"
      ]
    )

    return uninstall
  }
}
