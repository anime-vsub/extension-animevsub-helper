/* eslint-disable camelcase */
/* eslint-disable no-undef */

import { sendMessage } from "@tachibana-shin/webext-bridge/content-script"
import browser from "webextension-polyfill"

import type {
  OptionsHttpGet,
  OptionsHttpPost,
  ResponseHttp
} from "../background"
import { base64ToArrayBuffer } from "../logic/base64ToArrayBuffer"
import { randomUUID } from "../logic/randomUUID"

import type { DetailCustomEvent_sendToIndex } from "./inject"

function get(options: OptionsHttpGet) {
  return sendMessage("http:get", options) as unknown as Promise<ResponseHttp>
}
function post(options: OptionsHttpPost) {
  return sendMessage("http:post", options) as unknown as Promise<ResponseHttp>
}

export interface DetailCustomEvent_sendToInject {
  id: string
  ok: boolean
  res: ResponseHttp
}

function createListenerRequest<
  Options extends OptionsHttpGet | OptionsHttpPost
>(type: "get" | "post", fn: (options: Options) => Promise<ResponseHttp>) {
  return (async ({ detail }: CustomEvent<DetailCustomEvent_sendToIndex>) => {
    // eslint-disable-next-line functional/no-let
    let options: Options

    if (detail.req.signal) {
      if (detail.req.signal.aborted) {
        options = {
          ...detail.req,
          signalId: true
        } as Options
      } else {
        const signalId = randomUUID()
        // eslint-disable-next-line functional/immutable-data
        detail.req.signal.onabort = () =>
          sendMessage(`http:${type}:aborted=${signalId}`, {})
        options = {
          ...detail.req,
          signalId
        } as Options
      }

      // eslint-disable-next-line functional/immutable-data
      delete detail.req.signal
    } else {
      options = detail.req as Options
    }

    document.dispatchEvent(
      new CustomEvent<DetailCustomEvent_sendToInject>(`response:http-${type}`, {
        detail: await fn(options)
          .then((res): DetailCustomEvent_sendToInject => {
            if (detail.req.responseType === "arraybuffer")
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
  }) as unknown as EventListenerOrEventListenerObject
}

document.addEventListener("request:http-get", createListenerRequest("get", get))
document.addEventListener(
  "request:http-post",
  createListenerRequest("post", post)
)
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
