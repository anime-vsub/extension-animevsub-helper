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
export type OptionsHttpGet = {
  url: string
  headers?: Record<string, string>
  responseType?: "arraybuffer"
  signalId?: string | true
}
export type OptionsHttpPost = OptionsHttpGet & {
  data?: Record<string, string>
}

async function sendRequest(
  type: "get" | "post",
  { url, headers, responseType, signalId }: OptionsHttpGet,
  extendsOptionFetch?: RequestInit
): Promise<ResponseHttp> {
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
      cancelAbort = onMessage(`http:${type}:aborted=${signalId}`, () => {
        controller.abort()
        cancelAbort?.()
      })
    }
  }
  const res = await fetch(url, {
    headers: new Headers(headers),
    credentials: "include",
    signal,
    ...extendsOptionFetch
  })
    .then((result) => {
      cancelAbort?.()
      return result
    })
    .catch((err) => {
      cancelAbort?.()
      // eslint-disable-next-line promise/no-return-wrap
      return Promise.reject(err)
    })

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
}

onMessage<OptionsHttpGet, string>(
  "http:get",
  ({ data }): Promise<ResponseHttp> => sendRequest("get", data)
)
onMessage<OptionsHttpPost, string>(
  "http:post",
  ({ data }): Promise<ResponseHttp> => {
    const form = new FormData()

    Object.entries(data.data ?? {}).forEach(([key, val]) =>
      form.append(key, val)
    )

    return sendRequest("post", data, {
      method: "POST",
      body: form
    })
  }
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
