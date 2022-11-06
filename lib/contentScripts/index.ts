/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */

import { sendMessage } from "webext-bridge"
import browser from "webextension-polyfill"

import type {
  OptionsHttpGet,
  OptionsHttpPost,
  ResponseHttp
} from "../background"
import { base64ToArrayBuffer } from "../logic/base64ToArrayBuffer"

function get(options: OptionsHttpGet) {
  return sendMessage("http:get", {
    url: options.url,
    headers: options.headers,
    responseType: options.responseType
  }) as unknown as Promise<ResponseHttp>
}
function post(options: OptionsHttpPost) {
  return sendMessage("http:post", {
    url: options.url,
    headers: options.headers,
    responseType: options.responseType,
    data: options.data
  }) as unknown as Promise<ResponseHttp>
}

export interface DetailCustomEvent {
  id: string
  ok: boolean
  res: ResponseHttp
}

document.addEventListener("request:http-get", async ({ detail }: any) => {
  document.dispatchEvent(
    new CustomEvent("response:http-get", {
      detail: await get(detail)
        .then((res): DetailCustomEvent => {
          if (detail.responseType === "arraybuffer")
            // eslint-disable-next-line functional/immutable-data
            res.data = base64ToArrayBuffer(res.data as string)
          return {
            id: detail.id,
            ok: true,
            res
          }
        })
        .catch((err) => {
          return {
            id: detail.id,
            ok: false,
            res: err
          }
        })
    })
  )
})

document.addEventListener("request:http-post", async ({ detail }: any) => {
  document.dispatchEvent(
    new CustomEvent("response:http-post", {
      detail: await post(detail)
        .then((res): DetailCustomEvent => {
          if (detail.responseType === "arraybuffer")
            // eslint-disable-next-line functional/immutable-data
            res.data = base64ToArrayBuffer(res.data as string)
          return {
            id: detail.id,
            ok: true,
            res
          }
        })
        .catch((err) => {
          return {
            id: detail.id,
            ok: false,
            res: err
          }
        })
    })
  )
})
;(() => {
  console.log("start inject")
  const s = document.createElement("script")
  // eslint-disable-next-line functional/immutable-data
  s.src = browser.runtime.getURL("dist/contentScripts/inject.global.js")
  // eslint-disable-next-line functional/immutable-data
  s.onload = () => s.remove()
  ;(document.head || document.documentElement).prepend(s)
  // where id === uuid then found
})()
