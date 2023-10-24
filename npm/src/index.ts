/* eslint-disable camelcase */
/* eslint-disable no-undef */
import type { ArgumentsType } from "vitest"

import type { RequestOption, RequestResponse } from "../../lib/background"
import type { DetailCustomEvent_sendToInject } from "../../lib/contentScripts"
import { base64ToArrayBuffer } from "../../lib/logic/base64ToArrayBuffer"
import { decodeDetail } from "../../lib/logic/encoder-detail"
import { randomUUID } from "../../lib/logic/randomUUID"
import { version as versionClient } from "../../package.json"

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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GetOption extends ClientRequestOption {}
export interface PostOption extends ClientRequestOption {
  data?: RequestOption["data"]
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

export interface HttpType {
  version: string
  versionClient: string
  allowedRoot: boolean
  get: (options: GetOption) => Promise<RequestResponse>
  post: (options: PostOption) => Promise<RequestResponse>
}

const allowedRoot: boolean = JSON.parse(
  document.documentElement.dataset.httpAllow ?? "false"
)
const version: string | null =
  document.documentElement.dataset.httpVersion ?? null

export const Http = <HttpType>{
  get: !allowedRoot ? notAllow : (options) => createPorter("get", options),
  post: !allowedRoot ? notAllow : (options) => createPorter("post", options),
  version,
  versionClient,
  allowedRoot
}

export const tabsApi = JSON.parse(
  document.documentElement.dataset.tabsApi ?? "false"
) as boolean
export function execTabs<
  T extends
    | "discard"
    | "query"
    | "reload"
    | "connect"
    | "discard"
    | "duplicate"
    // | "show"
    // | "hide"
    | "move"
    | "remove"
    | "update"
>(
  type: T,
  args: ArgumentsType<(typeof chrome.tabs)[T]>
): Promise<Awaited<ReturnType<(typeof chrome.tabs)[T]>>> {
  // eslint-disable-next-line functional/no-throw-statements
  if (!tabsApi) throw new Error("Version extension not support tabs api.")

  // eslint-disable-next-line @typescript-eslint/no-extra-parens
  return new Promise<Awaited<ReturnType<(typeof chrome.tabs)[T]>>>(
    (resolve, reject) => {
      const id = randomUUID()
      const handler = (({
        detail
      }: CustomEvent<{
        id: string
        ok: boolean
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: any
      }>) => {
        detail = decodeDetail(detail)
        if (detail.id === id) {
          if (detail.ok) resolve(detail.res)
          else reject(detail.res)

          document.removeEventListener("tabs:response", handler)
        }
      }) as EventListenerOrEventListenerObject
      document.addEventListener("tabs:response", handler)

      document.dispatchEvent(
        new CustomEvent("tabs", {
          detail: { id, type, args }
        })
      )
    }
  )
}

export function setReferrers(referrers: Record<string, string>) {
  const id = randomUUID()
  return new Promise<void>((resolve) => {
    const handler = (({ detail }: CustomEvent<{ id: string }>) => {
      detail = decodeDetail(detail)
      if (detail.id === id) {
        document.removeEventListener("res:set:referrers", handler)
        resolve()
      }
    }) as EventListenerOrEventListenerObject
    document.addEventListener("res:set:referrers", handler)

    document.dispatchEvent(
      new CustomEvent("set:referrers", {
        detail: { id, referrers }
      })
    )
  })
}

export const customReferer = JSON.parse(
  document.documentElement.dataset.customReferer ?? "false"
) as boolean
