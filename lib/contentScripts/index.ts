/* eslint-disable no-undef */

import { sendMessage } from "@tachibana-shin/webext-bridge/content-script"

import { version } from "../../package.json"
import type { RequestOption, RequestResponse } from "../background"
import { isFirefox } from "../env"
import { base64ToArrayBuffer } from "../logic/base64ToArrayBuffer"
import { encodeDetail } from "../logic/encoder-detail"

export interface DetailCustomEvent_sendToInject {
  id: string
  isBuffer?: boolean
  ok: boolean
  res: RequestResponse
}

document.addEventListener("http:request", (async ({
  detail
}: CustomEvent<{
  id: string
  req: RequestOption
}>) => {
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
document.addEventListener("tabs", (async ({
  detail
}: CustomEvent<{
  id: string
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
}>) => {
  document.dispatchEvent(
    new CustomEvent("tabs:response", {
      detail: encodeDetail(
        await sendMessage("tabs", detail)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then((res: any) => {
            return {
              id: detail.id,
              ok: true,
              res
            }
          })
          .catch((error) => {
            return {
              id: detail.id,
              ok: false,
              res: error
            }
          })
      )
    })
  )
}) as unknown as EventListenerOrEventListenerObject)
document.addEventListener("set:referer", (async ({
  detail
}: CustomEvent<{
  id: string
  referers: Record<string, string>
}>) => {
  await sendMessage("set:referer", detail.referers)
  document.dispatchEvent(
    new CustomEvent("res:set:referer", {
      detail: {
        id: detail.id
      }
    })
  )
}) as unknown as EventListenerOrEventListenerObject)

document.documentElement.dataset.httpVersion = version
document.documentElement.dataset.httpAllow = JSON.stringify(true)
document.documentElement.dataset.tabsApi = JSON.stringify(true)
