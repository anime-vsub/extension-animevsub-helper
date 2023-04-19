/* eslint-disable no-undef */

import { onMessage } from "@tachibana-shin/webext-bridge/background"
import { serialize } from "cookie"
import browser from "webextension-polyfill"

import { arrayBufferToBase64 } from "../logic/arrayBufferToBase64"


let listenBeforeSendHeaders: (details: browser.WebRequest.OnBeforeSendHeadersDetailsType) => void | browser.WebRequest.BlockingResponseOrPromise

let runnedOverwriteReferer = false

async function uninstallOverwriteReferer() {
  if (typeof chrome !== "undefined" && chrome.declarativeNetRequest)
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: (await chrome.declarativeNetRequest.getDynamicRules()).map(item => item.id)
    })
  else
    listenBeforeSendHeaders && await browser.webRequest.onBeforeSendHeaders.removeListener(listenBeforeSendHeaders)
}
/** @description this paragraph modifies the title of anything that has the #vsub tag, it looks powerful in the middle */
async function initOverwriteReferer() {
  if (runnedOverwriteReferer) return
  runnedOverwriteReferer = true

  await uninstallOverwriteReferer()

  const urlFilterV3 = `#animevsub-vsub|`
  const urlFilterV2 = `#animevsub-vsub`
  const referer = "https://animevietsub.tv/"

  if (typeof chrome !== "undefined" && chrome.declarativeNetRequest)
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [{
        "id": 1,
        "priority": 1,
        "action": {
          "type": chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          "requestHeaders": [
            { "header": "Referer", "operation": chrome.declarativeNetRequest.HeaderOperation.SET, "value": referer }
          ]
        },
        "condition": {
          "urlFilter": urlFilterV3,
          "resourceTypes": [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST] // see available https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-ResourceType
        }
      }],
    })
  else
    await browser.webRequest.onBeforeSendHeaders.addListener(listenBeforeSendHeaders = (details) => {
	  if (!details.url.endsWith(urlFilterV2)) return
      const refererCurrent = details.requestHeaders?.find(item => item.name.toLowerCase() === "referer")

      if (refererCurrent)
        refererCurrent.value = referer
      else {
        if (!details.requestHeaders) details.requestHeaders = []
        details.requestHeaders.push({ name: "Referer", value: referer });
      }

      return { requestHeaders: details.requestHeaders };
    }, {
      urls: ["<all_urls>"]
    }, [
      "requestHeaders",
      "blocking",
      // "extraHeaders"
    ]);
}

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

  await initOverwriteReferer()

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
        // eslint-disable-next-line n/no-unsupported-features/es-builtins
        headers: Object.fromEntries(
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          (await mergeSetCookie(res.headers, res.url)).entries()
        ),
        data:
          responseType === "arraybuffer"
            ? // eslint-disable-next-line operator-linebreak
            // eslint-disable-next-line promise/no-nesting, indent
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
  // not merge;
  const cookies = await browser.cookies.getAll({ url })
  headers = new Headers(headers)

  headers.set(
    "set-cookie",
    cookies
      .map((item) => {
        return serialize(item.name, item.value, {
          ...item,
          sameSite: "none",
          ...(item.expirationDate
            ? { expires: new Date(Date.now() + item.expirationDate) }
            : {})
        })
      })
      .join(",")
  )

  return headers
}
