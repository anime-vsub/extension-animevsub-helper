import { EXTRA, HASH } from "../../env"

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

const typesUa = Object.keys(mapUa) as (keyof typeof mapUa)[]
let currentId = 0

export function createRule(endsWith: string, referer: string) {
  endsWith = `${HASH}${endsWith}`
  const rules: chrome.declarativeNetRequest.Rule[] = [
    {
      id: currentId++,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        requestHeaders: [
          {
            header: "Referer",
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value: referer
          }
        ]
      },
      condition: {
        urlFilter: endsWith + "|",
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST
        ] // see available https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-ResourceType
      }
    },
    {
      id: currentId++,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        requestHeaders: [
          {
            header: "Referer",
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value: referer
          }
        ],
        responseHeaders: [
          {
            header: "Access-Control-Allow-Origin",
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value: "*"
          },
          {
            header: "Access-Control-Allow-Methods",
            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            value: "PUT, GET, HEAD, POST, DELETE, OPTIONS"
          }
        ]
      },
      condition: {
        urlFilter: endsWith + EXTRA + "|",
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          chrome.declarativeNetRequest.ResourceType.IMAGE,
          chrome.declarativeNetRequest.ResourceType.MEDIA
        ] // see available https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-ResourceType
      }
    }
  ]

  rules.forEach((rule) => {
    typesUa.forEach((typeUa) => {
      const ruleCloned = JSON.parse(JSON.stringify(rule))
      ruleCloned.id = currentId++
      ruleCloned.action.requestHeaders?.push({
        header: "User-Agent",
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: mapUa[typeUa]
      })
      ruleCloned.condition.urlFilter =
        ruleCloned.condition.urlFilter?.slice(0, -1) +
        "_ua" +
        typeUa +
        "|"

      rules.push(ruleCloned)
    })
  })

  return rules
}