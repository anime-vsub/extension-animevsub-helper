/* eslint-disable operator-linebreak */
/* eslint-disable no-undef */

import { onMessage } from "@tachibana-shin/webext-bridge/background"
import { serialize } from "cookie"
import browser from "webextension-polyfill"

import referersDefault from "../../map-referer.json"
import { EXTRA } from "../env"
import { arrayBufferToBase64 } from "../logic/arrayBufferToBase64"

import { getReferers } from "./logic/get-referers"
import { installReferers } from "./logic/install-referer"

// setup install rules default
const setup = getReferers().then((objects) =>
  installReferers({
    ...referersDefault,
    ...(objects as Record<string, string>)
  })
)

onMessage("set:referer", async (object) => {
  await setup
  await installReferers(object as unknown as Record<string, string>)
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
