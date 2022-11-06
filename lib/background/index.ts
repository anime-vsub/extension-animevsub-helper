/* eslint-disable no-undef */

import { serialize } from "cookie"
import { onMessage } from "webext-bridge"
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
}
onMessage<OptionsHttpGet, string>(
  "http:get",
  async ({ data: { url, headers, responseType } }): Promise<ResponseHttp> => {
    const res = await fetch(url, {
      headers: new Headers(headers),
      credentials: "include"
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
)

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OptionsHttpPost = {
  url: string
  headers?: Record<string, string>
  responseType?: "arraybuffer"
  data?: Record<string, string>
}
onMessage<OptionsHttpPost, string>(
  "http:post",
  async ({
    data: { url, headers, responseType, data }
  }): Promise<ResponseHttp> => {
    const form = new FormData()

    Object.entries(data ?? {}).forEach(([key, val]) => form.append(key, val))

    const res = await fetch(url, {
      method: "POST",
      headers: new Headers(headers),
      body: form,
      credentials: "include"
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
