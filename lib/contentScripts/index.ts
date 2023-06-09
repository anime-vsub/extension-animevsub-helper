/* eslint-disable camelcase */
/* eslint-disable no-undef */

import { sendMessage } from "@tachibana-shin/webext-bridge/content-script"
import browser from "webextension-polyfill"

import type { RequestResponse } from "../background"
import { isFirefox } from "../env"
import { base64ToArrayBuffer } from "../logic/base64ToArrayBuffer"
import { encodeDetail } from "../logic/encoder-detail"

import type { DetailCustomEvent_sendToIndex } from "./inject"

export interface DetailCustomEvent_sendToInject {
  id: string
  isBuffer?: boolean
  ok: boolean
  res: RequestResponse
}

document.addEventListener("http:request", (async ({
  detail
}: CustomEvent<DetailCustomEvent_sendToIndex>) => {
  document.dispatchEvent(
    new CustomEvent<DetailCustomEvent_sendToInject>("http:response", {
      detail: encodeDetail(
        await (
          sendMessage(
            "http:request",
            detail.req
          ) as unknown as Promise<RequestResponse>
        )
          .then((res): DetailCustomEvent_sendToInject => {
            switch (detail.req.responseType) {
              case "arraybuffer":
                res.data = isFirefox
                  ? (res.data as string)
                  : base64ToArrayBuffer(res.data as string)
                break
              case "json":
                res.data = JSON.parse(res.data as string)
                break
            }

            return {
              id: detail.id,
              isBuffer: isFirefox && detail.req.responseType === "arraybuffer",
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
      )
    })
  )
}) as unknown as EventListenerOrEventListenerObject)
document.addEventListener("http:aborted", (({
  detail: { signalId }
}: CustomEvent<{ signalId: string }>) => {
  sendMessage("http:aborted", { signalId })
}) as unknown as EventListenerOrEventListenerObject)
;(() => {
  console.log("start inject")
  const s = document.createElement("script")

  s.src = browser.runtime.getURL("dist/contentScripts/inject.global.js")

  s.onload = () => s.remove()
  ;(document.head || document.documentElement).prepend(s)
  // where id === uuid then found
})()
