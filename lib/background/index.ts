/* eslint-disable operator-linebreak */
/* eslint-disable no-undef */

import { onMessage } from "@tachibana-shin/webext-bridge/background"
import { serialize } from "cookie"
import browser from "webextension-polyfill"

import mapDeclareReferrer from "../../map-referer.json"
import { arrayBufferToBase64 } from "../logic/arrayBufferToBase64"
import { modifyHeader } from "../logic/modify-header"

declare const __MV3__: boolean

const hashesDeclareReferrer = Object.keys(
  mapDeclareReferrer
) as (keyof typeof mapDeclareReferrer)[]
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

const EXTRA = "_extra"

// eslint-disable-next-line functional/no-let
let runnedOverwriteReferer = false

// eslint-disable-next-line functional/no-let, prefer-const
let uninstallerOverwrite: Promise<(() => void) | undefined> | undefined
/** @description this paragraph modifies the title of anything that has the #vsub tag, it looks powerful in the middle */
async function initOverwriteReferer() {
  if (runnedOverwriteReferer) return
  runnedOverwriteReferer = true
  ;(await uninstallerOverwrite)?.()

  if (__MV3__) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: (await chrome.declarativeNetRequest.getDynamicRules()).map(
        (item) => item.id
      )
    })

    // eslint-disable-next-line functional/no-let
    let currentId = 1

    const rules: chrome.declarativeNetRequest.Rule[] = Object.entries(
      mapDeclareReferrer
    )
      .map(([endsWith, referer]) => {
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
      })
      .flat(1)

    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules
    })

    const ruleIds = rules.map((item) => item.id)

    return () => {
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      })
    }
  } else {
    const listenerBeforeSendHeadersOld = (
      details: browser.WebRequest.OnBeforeSendHeadersDetailsType
    ): browser.WebRequest.BlockingResponseOrPromise | void => {
      // eslint-disable-next-line functional/no-let
      let ua: keyof typeof mapUa | undefined
      // eslint-disable-next-line array-callback-return
      const hash = hashesDeclareReferrer.find((item) => {
        if (details.url.endsWith(item)) return true

        ua = typesUa.find((ua) => details.url.endsWith(item + "_ua" + ua))

        if (ua) return true
      })

      if (!hash) return
      modifyHeader(details, "referer", mapDeclareReferrer[hash])
      if (ua) modifyHeader(details, "user-agent", ua)

      return { requestHeaders: details.requestHeaders }
    }

    // new API
    const listenerBeforeSendHeaders = (
      details: browser.WebRequest.OnBeforeSendHeadersDetailsType
    ): browser.WebRequest.BlockingResponseOrPromise | void => {
      // eslint-disable-next-line functional/no-let
      let ua: keyof typeof mapUa | undefined
      // eslint-disable-next-line array-callback-return
      const hash = hashesDeclareReferrer.find((item) => {
        if (details.url.endsWith(item + EXTRA)) return true

        ua = typesUa.find((ua) =>
          details.url.endsWith(item + EXTRA + "_ua" + ua)
        )

        if (ua) return true
      })

      if (!hash) return
      modifyHeader(details, "referer", mapDeclareReferrer[hash])
      if (ua) modifyHeader(details, "user-agent", ua)

      return { requestHeaders: details.requestHeaders }
    }
    const listenerHeadersReceived = (
      details: browser.WebRequest.OnHeadersReceivedDetailsType
    ): browser.WebRequest.BlockingResponseOrPromise | void => {
      // eslint-disable-next-line functional/no-let
      let ua: keyof typeof mapUa | undefined
      // eslint-disable-next-line array-callback-return
      const hash = hashesDeclareReferrer.find((item) => {
        if (details.url.endsWith(item + EXTRA)) return true

        ua = typesUa.find((ua) =>
          details.url.endsWith(item + EXTRA + "_ua" + ua)
        )

        if (ua) return true
      })

      if (!hash) return
      modifyHeader(details, "access-control-allow-origin", "*", true)
      modifyHeader(
        details,
        "access-control-allow-methods",
        "PUT, GET, HEAD, POST, DELETE, OPTIONS",
        true
      )
      if (ua) modifyHeader(details, "user-agent", ua)

      return { responseHeaders: details.responseHeaders }
    }

    browser.webRequest.onBeforeSendHeaders.addListener(
      listenerBeforeSendHeadersOld,
      {
        urls: ["<all_urls>"]
      },
      [
        "requestHeaders",
        "blocking"
        // "extraHeaders"
      ]
    )
    const ResourceType = {
      XMLHTTPREQUEST: "xmlhttprequest",
      IMAGE: "image",
      MEDIA: "media"
    } as const
    browser.webRequest.onBeforeSendHeaders.addListener(
      listenerBeforeSendHeaders,
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
      listenerHeadersReceived,
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

    return () => {
      browser.webRequest.onBeforeSendHeaders.removeListener(
        listenerBeforeSendHeadersOld
      )
      browser.webRequest.onBeforeSendHeaders.removeListener(
        listenerBeforeSendHeaders
      )
      browser.webRequest.onHeadersReceived.removeListener(
        listenerHeadersReceived
      )
    }
  }
}
uninstallerOverwrite = initOverwriteReferer()

onMessage("get:HASH", async () => {
  await uninstallerOverwrite
  return EXTRA
})

export interface RequestResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: Record<string, any>
  data: string | ArrayBuffer
  url: string
  status: number
}

export type RequestOption = Pick<
  RequestInit,
  | "method"
  | "cache"
  | "integrity"
  | "keepalive"
  | "redirect"
  | "referrerPolicy"
  | "window"
> & {
  url: string
  headers?: Record<string, string>
  responseType?: "arraybuffer" | "json" | "text"
  signalId?: string | true
  data?: Record<string, number | string | boolean> | string
}

const eventsAbort = new (class EventsAbort {
  // eslint-disable-next-line func-call-spacing
  private readonly store = new Map<string, () => void>()

  constructor() {
    onMessage<{ signalId: string }>(
      "http:aborted",
      ({ data: { signalId } }) => {
        eventsAbort.store.get(signalId)?.()
      }
    )
  }

  on(id: string, fn: () => void) {
    this.store.set(id, fn)

    return () => this.store.delete(id)
  }
})()

async function sendRequest({
  url,
  headers,
  responseType,
  signalId,
  method,
  data
}: RequestOption): Promise<RequestResponse> {
  // eslint-disable-next-line functional/no-let
  let form: FormData | string | undefined
  if (data) {
    if (typeof data === "object") {
      form = new FormData()

      Object.entries(data ?? {}).forEach(([key, val]) =>
        (form as FormData).append(key, val as string)
      )
    } else {
      form = data
    }
  }

  // eslint-disable-next-line functional/no-let
  let signal: AbortSignal | undefined
  // eslint-disable-next-line functional/no-let
  let cancelAbort: (() => void) | undefined

  if (signalId) {
    const controller = new AbortController()
    signal = controller.signal
    if (signalId === true) {
      controller.abort()
    } else {
      // init abortcontroller
      cancelAbort = eventsAbort.on(signalId, () => {
        controller.abort()
        cancelAbort?.()
      })
    }
  }

  await uninstallerOverwrite

  return fetch(url, {
    headers: new Headers(headers),
    credentials: "include",
    signal,
    method,
    body: form
  })
    .then(async (res) => {
      cancelAbort?.()

      return {
        headers: await mergeSetCookie(res.headers, res.url),
        data:
          responseType === "arraybuffer"
            ? // eslint-disable-next-line promise/no-nesting
              await res.arrayBuffer().then(arrayBufferToBase64)
            : await res.text(),
        url: res.url,
        status: res.status
      }
    })
    .catch((err) => {
      cancelAbort?.()
      // eslint-disable-next-line functional/no-throw-statement
      throw err
    })
}

onMessage<RequestOption, string>(
  "http:request",
  ({ data }): Promise<RequestResponse> => sendRequest(data)
)

async function mergeSetCookie(headers: Headers, url: string) {
  // eslint-disable-next-line n/no-unsupported-features/es-builtins, @typescript-eslint/no-explicit-any
  const obj = Object.fromEntries((headers as unknown as any).entries())
  obj["set-cookie"] = (await browser.cookies.getAll({ url }))
    .map((item) =>
      serialize(item.name, item.value, {
        ...item,
        sameSite: "none",
        ...(item.expirationDate
          ? { expires: new Date(Date.now() + item.expirationDate) }
          : {})
      })
    )
    .join(",")

  return obj
}

// function auto fix
onMessage<{
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
}>("tabs", async ({ data }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (browser.tabs as unknown as any)[data.type].apply(
    browser.tabs,
    data.args
  )
})
