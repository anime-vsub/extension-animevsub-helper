/* eslint-disable no-undef */
import allowlist from "../../../allowlist.yaml"
import { EXTRA } from "../../env"

const mapUa = {
  firefox:
    "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0",
  chrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.41",
  gbot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  ybot: "Mozilla/5.0 (compatible; YandexAccessibilityBot/3.0; +http://yandex.com/bots)",
  achrome:
    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
  aedge:
    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36 Edg/114.0.1823.41"
} as const

const RuleActionType =
  typeof chrome?.declarativeNetRequest !== "undefined"
    ? chrome.declarativeNetRequest.RuleActionType
    : ({
        BLOCK: "block",
        REDIRECT: "redirect",
        ALLOW: "allow",
        UPGRADE_SCHEME: "upgradeScheme",
        MODIFY_HEADERS: "modifyHeaders",
        ALLOW_ALL_REQUESTS: "allowAllRequests"
      } as typeof chrome.declarativeNetRequest.RuleActionType)
const HeaderOperation =
  typeof chrome?.declarativeNetRequest !== "undefined"
    ? chrome.declarativeNetRequest.HeaderOperation
    : ({
        APPEND: "append",
        SET: "set",
        REMOVE: "remove"
      } as typeof chrome.declarativeNetRequest.HeaderOperation)
const ResourceType =
  typeof chrome?.declarativeNetRequest !== "undefined"
    ? chrome.declarativeNetRequest.ResourceType
    : ({
        MAIN_FRAME: "main_frame",
        SUB_FRAME: "sub_frame",
        STYLESHEET: "stylesheet",
        SCRIPT: "script",
        IMAGE: "image",
        FONT: "font",
        OBJECT: "object",
        XMLHTTPREQUEST: "xmlhttprequest",
        PING: "ping",
        CSP_REPORT: "csp_report",
        MEDIA: "media",
        WEBSOCKET: "websocket",
        OTHER: "other"
      } as typeof chrome.declarativeNetRequest.ResourceType)

const typesUa = Object.keys(mapUa) as (keyof typeof mapUa)[]
// eslint-disable-next-line functional/no-let
let currentId = 1

export function createRule(endsWith: string, referer: string) {
  console.log(endsWith, referer)
  // endsWith = `${HASH}${endsWith}`
  const rules: chrome.declarativeNetRequest.Rule[] = [
    {
      id: currentId++,
      priority: 1,
      action: {
        type: RuleActionType.MODIFY_HEADERS,
        requestHeaders: [
          {
            header: "Referer",
            operation: HeaderOperation.SET,
            value: referer
          }
        ]
      },
      condition: {
        urlFilter: endsWith + "|",
        resourceTypes: [ResourceType.XMLHTTPREQUEST] // see available https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-ResourceType
      }
    },
    {
      id: currentId++,
      priority: 1,
      action: {
        type: RuleActionType.MODIFY_HEADERS,
        requestHeaders: [
          {
            header: "Referer",
            operation: HeaderOperation.SET,
            value: referer
          }
        ],
        responseHeaders: [
          {
            header: "Access-Control-Allow-Origin",
            operation: HeaderOperation.SET,
            value: "*"
          },
          {
            header: "Access-Control-Allow-Methods",
            operation: HeaderOperation.SET,
            value: "PUT, GET, HEAD, POST, DELETE, OPTIONS"
          }
        ]
      },
      condition: {
        urlFilter: endsWith + EXTRA + "|",
        resourceTypes: [
          ResourceType.XMLHTTPREQUEST,
          ResourceType.IMAGE,
          ResourceType.MEDIA
        ], // see available https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-ResourceType
        initiatorDomains: allowlist.hosts
      }
    }
  ]

  // add rules set header Origin
  // eslint-disable-next-line functional/no-loop-statements
  for (let i = 0, length = rules.length; i < length; i++) {
    const newRule = {
      ...JSON.parse(JSON.stringify(rules[i])),
      id: currentId++
    }
    newRule.action.requestHeaders?.push({
      header: "Origin",
      operation: HeaderOperation.SET,
      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      value: referer ? new URL(referer).origin : ""
    })
    newRule.condition = {
      urlFilter: newRule.condition.urlFilter?.slice(0, -1) + "o|",
      resourceTypes: [ResourceType.XMLHTTPREQUEST] // see available https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-ResourceType
    }
    rules.push(newRule)
  }

  rules.forEach((rule) => {
    typesUa.forEach((typeUa) => {
      const ruleCloned = JSON.parse(JSON.stringify(rule))
      ruleCloned.id = currentId++
      ruleCloned.action.requestHeaders?.push({
        header: "User-Agent",
        operation: HeaderOperation.SET,
        value: mapUa[typeUa]
      })
      ruleCloned.condition.urlFilter =
        ruleCloned.condition.urlFilter?.slice(0, -1) + "_ua" + typeUa + "|"

      rules.push(ruleCloned)
    })
  })

  return rules
}
