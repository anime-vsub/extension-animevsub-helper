/* eslint-disable no-undef */
import browser from "webextension-polyfill"

/**
 * Hosts that can be used as an embed provider.
 * Matches any TLD: animevietsub.id, animevietsub.xyz, www.animevietsub.tv, ...
 */
const EMBED_URL_REGEX = "^https?://([a-z0-9-]+\\.)*(?:animevietsub|googleapiscdn|fbcdns)\\.[a-z0-9.-]+/"
const EMBED_BRIDGE_REGEX = `${EMBED_URL_REGEX}[^#]*[?&]animevsub-embed-origins=[^&#]+`
const EMBED_RULE_ID = 900_001
const EMBED_BRIDGE_RULE_ID = 900_002

const BLOCKED_RESPONSE_HEADERS = new Set([
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only"
])

function isEmbedUrl(url: string) {
  return /^https?:\/\/([a-z0-9-]+\.)*(?:animevietsub|googleapiscdn|fbcdns)\.[a-z0-9.-]+/i.test(url)
}

/**
 * Allow `animevietsub.*` to be embedded in an iframe on any website by
 * stripping the headers that block framing.
 */
export async function installEmbedRules() {
  const extensionOrigin = new URL(browser.runtime.getURL("/")).origin
  const embedBridgeCsp = `default-src 'none'; script-src ${extensionOrigin}; connect-src http: https:`

  if (__MV3__) {
    const removeRuleIds = [EMBED_RULE_ID, EMBED_BRIDGE_RULE_ID]

    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds })
    chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [
        {
          id: EMBED_RULE_ID,
          priority: 1,
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
        },
        {
          id: EMBED_BRIDGE_RULE_ID,
          priority: 3,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
            responseHeaders: [
              {
                header: "X-Frame-Options",
                operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE
              },
              {
                header: "Content-Security-Policy",
                operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                value: embedBridgeCsp
              },
              {
                header: "Content-Security-Policy-Report-Only",
                operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE
              }
            ]
          },
          condition: {
            regexFilter: EMBED_BRIDGE_REGEX,
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

      const isEmbedBridge = new URL(details.url).searchParams.has(
        "animevsub-embed-origins"
      )
      details.responseHeaders = details.responseHeaders.filter((header) => {
        const name = header.name.toLowerCase()
        return !BLOCKED_RESPONSE_HEADERS.has(name)
      })

      if (isEmbedBridge) {
        details.responseHeaders.push({
          name: "Content-Security-Policy",
          value: embedBridgeCsp
        })
      }

      return details
    },
    {
      urls: ["<all_urls>"],
      types: ["sub_frame"]
    },
    ["responseHeaders", "blocking"]
  )
}
