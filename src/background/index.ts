/* eslint-disable no-undef */
// eslint-disable-next-line n/no-unpublished-import
import { onMessage } from "webext-bridge"
import { arrayBufferToBase64 } from "~/logic/arrayBufferToBase64"

import { serialize } from "cookie"

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OptionsHttpGet = {
  url: string
  headers?: Record<string, string>
  responseType?: "arraybuffer"
}
onMessage<OptionsHttpGet, string>(
  "http:get",
  async ({ data: { url, headers, responseType } }) => {
    const res = await fetch(url, {
      headers: new Headers(headers), credentials: 'include'
    })

    return {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      // eslint-disable-next-line n/no-unsupported-features/es-builtins
      headers: Object.fromEntries((await mergeSetCookie(res.headers , res.url)).entries()),
      data:
        responseType === "arraybuffer"
          ? await res.arrayBuffer().then(arrayBufferToBase64)
          : await res.text(),
      url: res.url,
      status: res.status,
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
  async ({ data: { url, headers, responseType, data } }) => {
    const form = new FormData()

    Object.entries(data ?? {}).forEach(([key, val]) => form.append(key, val))

    const res = await fetch(url, {
      method: "POST",
      headers: new Headers(headers),
      body: form, credentials: 'include'
    })

    return {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      // eslint-disable-next-line n/no-unsupported-features/es-builtins
      headers: Object.fromEntries((await mergeSetCookie(res.headers , res.url)).entries()),
      data:
        responseType === "arraybuffer"
          ? await res.arrayBuffer().then(arrayBufferToBase64)
          : await res.text(),
      url: res.url,
      status: res.status,
    }
  }
)

async function mergeSetCookie(headers: Headers, url: string) {
  // not merge; 
  const cookies = await chrome.cookies.getAll({url});
  headers = new Headers(headers)
  
  headers.set("set-cookie", 
cookies.map(item => {
  return (serialize(item.name, item.value, {...item,sameSite: 'none',...item.expirationDate?{expires: new Date(Date.now() + item. expirationDate)}: {}}))
}).join(",")
)

return headers
}