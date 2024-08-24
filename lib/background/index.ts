/* eslint-disable operator-linebreak */
/* eslint-disable no-undef */

import { onMessage } from "@tachibana-shin/webext-bridge/background"
import { serialize } from "cookie"
import browser from "webextension-polyfill"

import referrersDefault from "../../map-referer.json"
import { EXTRA } from "../env"
import { arrayBufferToBase64 } from "../logic/arrayBufferToBase64"

import { getReferrers } from "./logic/get-referrers"
import { installReferrers } from "./logic/install-referers"

// setup install rules default
const setup = Promise.all([
  installReferrers(referrersDefault),
  getReferrers().then((referrers) =>
    installReferrers(referrers as Record<string, string>)
  )
])

onMessage<Record<string, string>>("set:referrers", async ({ data }) => {
  await setup
  await installReferrers(data)
})
onMessage("get:HASH", async () => {
  await setup
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

// eslint-disable-next-line functional/no-classes
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

  await setup

  if (headers?.["c-cookie"]) await setCookie(url, headers["c-cookie"])

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
      // eslint-disable-next-line functional/no-throw-statements
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

async function setCookie(url: string, cookie: string) {
  return Promise.all(
    cookie.split(";").map(async (item) => {
      const equal = item.indexOf("=")
      if (equal === -1) return

      const name = item.slice(0, equal)
      const value = item.slice(equal + 1)

      await chrome.cookies.set({
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        domain: new URL(url).hostname,
        name,
        path: "/",
        value,
        url,
        httpOnly: true,
        secure: false,
        storeId: "0"
      })
    })
  )
}
