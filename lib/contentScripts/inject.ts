/* eslint-disable camelcase */
/* eslint-disable no-undef */
import allowlist from "../../allowlist.yaml"
import { version } from "../../package.json"
import type { RequestOption, RequestResponse } from "../background"
import { base64ToArrayBuffer } from "../logic/base64ToArrayBuffer"
import { decodeDetail } from "../logic/encoder-detail"
import { randomUUID } from "../logic/randomUUID"

import type { DetailCustomEvent_sendToInject } from "."

export interface ClientRequestOption extends Omit<RequestOption, "signalId"> {
  signal?: AbortSignal
}
export interface DetailCustomEvent_sendToIndex {
  id: string
  req: RequestOption
}
function createPorter(method: string, options: ClientRequestOption) {
  const rqOptions: RequestOption & { method: typeof method } = {
    ...options,
    method
  }
  return new Promise<RequestResponse>((resolve, reject) => {
    const id = randomUUID()
    const handler = (({
      detail
    }: CustomEvent<DetailCustomEvent_sendToInject>) => {
      detail = decodeDetail(detail)
      if (detail.id === id) {
        if (detail.ok) {
          if (detail.isBuffer)
            detail.res.data = base64ToArrayBuffer(detail.res.data as string)

          resolve(detail.res)
        } else {
          reject(detail.res)
        }
        document.removeEventListener("http:response", handler)
      }
    }) as EventListenerOrEventListenerObject
    document.addEventListener("http:response", handler)

    if (options.signal) {
      if (options.signal.aborted) {
        rqOptions.signalId = true
      } else {
        const signalId = randomUUID()

        options.signal.onabort = () =>
          document.dispatchEvent(
            new CustomEvent("http:aborted", { detail: { signalId } })
          )

        rqOptions.signalId = signalId
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (rqOptions as any).signal
    }

    document.dispatchEvent(
      new CustomEvent<DetailCustomEvent_sendToIndex>("http:request", {
        detail: { id, req: rqOptions }
      })
    )
  })
}

const notAllow = () =>
  Promise.reject(
    Object.assign(
      new Error("Your domain is not permission to access the Http API"),
      {
        code: "NOT_ALLOW_PREMISSION"
      }
    )
  )

type BaseOption = Omit<ClientRequestOption, "method" | "data">
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface GetOption extends BaseOption {}
interface PostOption extends BaseOption {
  data?: RequestOption["data"]
}

export interface Http {
  version: string
  allowlist: { hosts: string[] }
  get: (options: GetOption) => Promise<RequestResponse>
  post: (options: PostOption) => Promise<RequestResponse>
}

const allowedRoot = allowlist.hosts.some((url: string) => {
  // checker
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const host = new URL(url.includes("://") ? url : `http://${url}`)

  if (host.hostname !== location.hostname) return false
  if (host.protocol.endsWith("s:") && !location.protocol.endsWith("s:"))
    return false

  return location.pathname.startsWith(host.pathname)
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).Http = <Http>{
  get: allowedRoot ? (options) => createPorter("get", options) : notAllow,
  post: allowedRoot ? (options) => createPorter("post", options) : notAllow,
  version,
  allowedRoot,
  allowlist: JSON.parse(JSON.stringify(allowlist))
}
