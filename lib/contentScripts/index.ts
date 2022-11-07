/* eslint-disable camelcase */
/* eslint-disable no-undef */

import { sendMessage } from "@tachibana-shin/webext-bridge/content-script"
import browser from "webextension-polyfill"

import type {
  RequestOption,
  ResponseHttp
} from "../background"
import { base64ToArrayBuffer } from "../logic/base64ToArrayBuffer"
import { randomUUID } from "../logic/randomUUID"

import type { DetailCustomEvent_sendToIndex } from "./inject"


export interface DetailCustomEvent_sendToInject {
  id: string
  ok: boolean
  res: ResponseHttp
}

function createListenerRequest() {
  return (async ({ detail }: CustomEvent<DetailCustomEvent_sendToIndex>) => {
    document.dispatchEvent(
      new CustomEvent<DetailCustomEvent_sendToInject>("http:response", {
        detail: await sendMessage("http:request", detail.req)
          .then((res): DetailCustomEvent_sendToInject => {
            switch (detail.req.responseType) {
              case "arraybuffer":
                res.data = base64ToArrayBuffer(res.data as string)
                break
              case "json":
                res.data = JSON.parse(res.data as string)
                break
            }
              
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

document.addEventListener("http:request", createListenerRequest())
document.addEventListener("http:aborted", ({ detail: { signalId } }: CustomEvent<{signalId: string}>) => {
    sendMessage("http:aborted", { signalId })
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
