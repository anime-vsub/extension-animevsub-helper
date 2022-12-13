/* eslint-disable camelcase */
/* eslint-disable no-undef */
import { version } from "../../package.json"
import type { RequestOption, RequestResponse } from "../background"
import { base64ToArrayBuffer } from "../logic/base64ToArrayBuffer"
import { decodeDetail } from "../logic/encoder-detail"
import { randomUUID } from "../logic/randomUUID"

import allowlist from "../../allowlist.yaml"

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
            // eslint-disable-next-line functional/immutable-data
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
        // eslint-disable-next-line functional/immutable-data
        rqOptions.signalId = true
      } else {
        const signalId = randomUUID()
        // eslint-disable-next-line functional/immutable-data
        options.signal.onabort = () =>
          document.dispatchEvent(
            new CustomEvent("http:aborted", { detail: { signalId } })
          )
        // eslint-disable-next-line functional/immutable-data
        rqOptions.signalId = signalId
      }

      // eslint-disable-next-line functional/immutable-data, @typescript-eslint/no-explicit-any
      delete (rqOptions as any).signal
    }

    document.dispatchEvent(
      new CustomEvent<DetailCustomEvent_sendToIndex>("http:request", {
        detail: { id, req: rqOptions }
      })
    )
  })
}

function createNotAllow(method: string) {
  return async (options) => {
    if (await getAllowed()) return createPorter(method, options)
    return Promise.reject(
      Object.assign(
        new Error("Your domain is not permission to access the Http API"),
        {
          code: "NOT_ALLOW_PREMISSION"
        }
      )
    )
  }
}

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

const allowedRoot = allowlist.hosts.some((host) => {
  // checker
  host = new URL(host.includes("://") ? host : `http://${host}`)

  if (host.hostname !== location.hostname) return false
  if (host.protocol.endsWith("s:") && !location.protocol.endsWith("s:"))
    return false

  return location.pathname.startsWith(host.pathname)
})

let _allowed
const getAllowed = () => {
  if (_allowed) return _allowed
  return (_allowed = new Promise<boolean>(async (resolve, reject) => {
    if (allowedRoot) return resolve(true)

    // check with API
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/anime-vsub/extension-animevsub-helper/allowlist/${location.hostname}`
      )

      if (!res.ok) {
        resolve(false)
        return
      }

      const { allow, pathname } = await res.json()

      resolve(allow && location.pathname.startsWith(pathname))
    } catch {
      reject(
        Object.assign(
          new Error("Could not validate access to this site's API"),
          {
            code: "NOT_VALIDATE_PERMISSION"
          }
        )
      )
    }
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, functional/immutable-data
;(window as any).Http = <Http>{
  get: allowedRoot
    ? (options) => createPorter("get", options)
    : createNotAllow("get"),
  post: allowedRoot
    ? (options) => createPorter("post", options)
    : createNotAllow("post"),
  version,
  allowedRoot,
  getAllowed,
  allowlist: JSON.parse(JSON.stringify(allowlist))
}
