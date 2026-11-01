/* eslint-disable no-undef */
import browser from "webextension-polyfill"

/**
 * Hosts that can be used as an embed provider.
 * Matches any TLD: animevietsub.id, animevietsub.xyz, www.animevietsub.tv, ...
 */
const EMBED_URL_REGEX = "^https?://([a-z0-9-]+\\.)*animevietsub\\.[a-z0-9.-]+/"
const EMBED_RULE_ID = 900_001

const BLOCKED_RESPONSE_HEADERS = new Set([
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only"
])

function isEmbedUrl(url: string) {
  return /^https?:\/\/([a-z0-9-]+\.)*animevietsub\.[a-z0-9.-]+/i.test(url)
}

/**
 * Allow `animevietsub.*` to be embedded in an iframe on any website by
 * stripping the headers that block framing.
 */
export async function installEmbedRules() {
  if (__MV3__) {
    const removeRuleIds = [EMBED_RULE_ID]

    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds })
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [
        {
          id: EMBED_RULE_ID,
          priority: 2,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
            responseHeaders: [
              {
                header: "X-Frame-Options",
                operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE
              },
              {
                header: "Content-Security-Policy",
                operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE
              },
              {
                header: "Content-Security-Policy-Report-Only",
                operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE
              }
            ]
          },
          condition: {
            regexFilter: EMBED_URL_REGEX,
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.SUB_FRAME]
          }
        }
      ]
    })

    return
  }

  browser.webRequest.onHeadersReceived.addListener(
    (details) => {
      if (!isEmbedUrl(details.url)) return undefined
      if (!details.responseHeaders) return details

      details.responseHeaders = details.responseHeaders.filter(
        (header) => !BLOCKED_RESPONSE_HEADERS.has(header.name.toLowerCase())
      )

      return details
    },
    {
      urls: ["<all_urls>"],
      types: ["sub_frame"]
    },
    ["responseHeaders", "blocking"]
  )
}
