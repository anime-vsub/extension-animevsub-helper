/* eslint-disable operator-linebreak */
/* eslint-disable no-undef */

import { onMessage } from "@tachibana-shin/webext-bridge/background"
import { serialize } from "cookie"
import browser from "webextension-polyfill"

import { arrayBufferToBase64 } from "../logic/arrayBufferToBase64"

const mapDeclareReferrer = {
  "#animevsub-vsub": "https://animevietsub.tv/",
  "#vuighe": "https://vuighe.net/"
} as const
const countDeclares = Object.keys(mapDeclareReferrer).length
const hashesDeclareReferrer = Object.keys(
  mapDeclareReferrer
) as (keyof typeof mapDeclareReferrer)[]

const EXTRA = "_extra"

// eslint-disable-next-line functional/no-let
let runnedOverwriteReferer = false

const uninstallerOverwrite = initOverwriteReferer()
/** @description this paragraph modifies the title of anything that has the #vsub tag, it looks powerful in the middle */
async function initOverwriteReferer() {
  if (runnedOverwriteReferer) return
  runnedOverwriteReferer = true
  ;(await uninstallerOverwrite)?.()

  if (typeof chrome !== "undefined" && chrome.declarativeNetRequest) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: (
        await chrome.declarativeNetRequest.getDynamicRules()
      ).map((item) => item.id)
    })

    const rules: chrome.declarativeNetRequest.Rule[] = Object.entries(
      mapDeclareReferrer
    )
      .map(([endsWith, referer], id) => {
        const rules: chrome.declarativeNetRequest.Rule[] = [
          {
            id: id + 1,
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
            id: id + countDeclares + 1,
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

        return rules
      })
      .flat(1)
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules
    })

    const ruleIds = rules.map((item) => item.id)

    return () =>
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      })
  } else {
    const listenerBeforeSendHeadersOld = (
      details: browser.WebRequest.OnBeforeSendHeadersDetailsType
    ): browser.WebRequest.BlockingResponseOrPromise | void => {
      const hash = hashesDeclareReferrer.find((item) =>
        details.url.endsWith(item)
      )

      if (!hash) return
      const refererCurrent = details.requestHeaders?.find(
        (item) => item.name.toLowerCase() === "referer"
      )

      if (refererCurrent) {
        refererCurrent.value = mapDeclareReferrer[hash]
      } else {
        if (!details.requestHeaders) details.requestHeaders = []
        details.requestHeaders.push({
          name: "Referer",
          value: mapDeclareReferrer[hash]
        })
      }

      return { requestHeaders: details.requestHeaders }
    }

    // new API
    const listenerBeforeSendHeaders = (
      details: browser.WebRequest.OnBeforeSendHeadersDetailsType
    ): browser.WebRequest.BlockingResponseOrPromise | void => {
      const hash = hashesDeclareReferrer.find((item) =>
        details.url.endsWith(item + EXTRA)
      )

      if (!hash) return
      const refererCurrent = details.requestHeaders?.find(
        (item) => item.name.toLowerCase() === "referer"
      )

      if (refererCurrent) {
        refererCurrent.value = mapDeclareReferrer[hash]
      } else {
        if (!details.requestHeaders) details.requestHeaders = []
        details.requestHeaders.push({
          name: "Referer",
          value: mapDeclareReferrer[hash]
        })
      }

      return { requestHeaders: details.requestHeaders }
    }
    const listenerHeadersReceived = (
      details: browser.WebRequest.OnHeadersReceivedDetailsType
    ): browser.WebRequest.BlockingResponseOrPromise | void => {
      const hash = hashesDeclareReferrer.find((item) =>
        details.url.endsWith(item + EXTRA)
      )

      if (!hash) return
      // eslint-disable-next-line functional/no-let
      let accessControlAllowOriginCurrent:
          | browser.WebRequest.HttpHeadersItemType
          | undefined,
        accessControlAllowMethodsCurrent:
          | browser.WebRequest.HttpHeadersItemType
          | undefined

      if (details.responseHeaders) {
        details.responseHeaders.forEach((item) => {
          if (item.name.toLowerCase() === "access-control-allow-origin") {
            accessControlAllowOriginCurrent = item
            return
          }
          if (item.name.toLowerCase() === "access-control-allow-methods")
            accessControlAllowMethodsCurrent = item
        })
      } else {
        details.responseHeaders = []
      }

      if (accessControlAllowOriginCurrent) {
        accessControlAllowOriginCurrent.value = "*"
      } else {
        details.responseHeaders.push({
          name: "Access-Control-Allow-Origin",
          value: "*"
        })
      }

      if (accessControlAllowMethodsCurrent) {
        accessControlAllowMethodsCurrent.value =
          "PUT, GET, HEAD, POST, DELETE, OPTIONS"
      } else {
        details.responseHeaders.push({
          name: "Access-Control-Allow-Methods",
          value: "PUT, GET, HEAD, POST, DELETE, OPTIONS"
        })
      }

      // detauls.requesHeaders is exists!
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
    browser.webRequest.onBeforeSendHeaders.addListener(
      listenerBeforeSendHeaders,
      {
        urls: ["<all_urls>"],
        types: [
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          chrome.declarativeNetRequest.ResourceType.IMAGE,
          chrome.declarativeNetRequest.ResourceType.MEDIA
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
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          chrome.declarativeNetRequest.ResourceType.IMAGE,
          chrome.declarativeNetRequest.ResourceType.MEDIA
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
  data?: Record<string, string> | string
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
        (form as FormData).append(key, val)
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
            ? // eslint-disable-next-line promise/no-nesting, indent
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
