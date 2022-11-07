/* eslint-disable no-undef */

import { onMessage } from "@tachibana-shin/webext-bridge/background"
import { serialize } from "cookie"
import browser from "webextension-polyfill"

import { arrayBufferToBase64 } from "../logic/arrayBufferToBase64"

export interface ResponseHttp {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: Record<string, any>
  data: string | ArrayBuffer
  url: string
  status: number
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RequestOption = {
  url: string
  method?: "get" | "post"
  headers?: Record<string, string>
  responseType?: "arraybuffer"
  signalId?: string | true
  data?: Record<string, string> | string
}

const eventsAbort = new class EventsAbort {
  readonly private store = new Map<string, () => void>()
  
  constructor() {
    
        onMessage("http:aborted", ({ data: { signalId } }) => {
          eventsAbort.store.get(signalId)?.()
        })
  }
  
  on(id: string, fn: () => void) {
    this.store.set(id, fn)
    
    return () => this.store.delete(id)
  }
}

async function sendRequest(
  { url, headers, responseType, signalId, method, data }: RequestOption
): Promise<ResponseHttp> {
  let form : FormData | string | undefined
    if (data) {
      if (typeof data === "object") {
        form = new FormData()
    
        Object.entries(data ?? {}).forEach(([key, val]) =>
          form.append(key, val)
        )
      }else {
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
      cancelAbort =eventsAbort.on(signalId, () => {
        controller.abort()
        cancelAbort?.()
      })
    }
  }
  
  
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
            ? await res.arrayBuffer().then(arrayBufferToBase64)
            : await res.text(),
        url: res.url,
        status: res.status
      }
    })
    .catch((err) => {
      cancelAbort?.()
      // eslint-disable-next-line promise/no-return-wrap
     throw err
    })

}

onMessage<OptionsHttpGet, string>(
  "http:request",
  ({ data }): Promise<ResponseHttp> => sendRequest(data)
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
