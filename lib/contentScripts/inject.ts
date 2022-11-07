/* eslint-disable camelcase */
/* eslint-disable no-undef */
import { version } from "../../package.json"
import type { OptionsHttpGet, OptionsHttpPost } from "../background"
import { randomUUID } from "../logic/randomUUID"

import type { DetailCustomEvent_sendToInject } from "."

export interface ClientOptionHttpGet extends Omit<OptionsHttpGet, "signalId"> {
  signal?: AbortSignal
}
export interface ClientOptionHttpPost
  extends Omit<OptionsHttpPost, "signalId"> {
  signal?: AbortSignal
}

export interface DetailCustomEvent_sendToIndex {
  id: string
  req: ClientOptionHttpGet | ClientOptionHttpPost
}
function createPorter(
  type: string,
  options: ClientOptionHttpGet | ClientOptionHttpPost
) {
  return new Promise((resolve, reject) => {
    const id = randomUUID()
    const handler = (({
      detail
    }: CustomEvent<DetailCustomEvent_sendToInject>) => {
      if (detail.id === id) {
        if (detail.ok) resolve(detail.res)
        else reject(detail.res)
        document.removeEventListener(`response:http-${type}`, handler)
      }
    }) as EventListenerOrEventListenerObject
    document.addEventListener(`response:http-${type}`, handler)
    document.dispatchEvent(
      new CustomEvent<DetailCustomEvent_sendToIndex>(`response:http-${type}`, {
        detail: { id, req: options }
      })
    )
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, functional/immutable-data
;(window as any).Http = {
  get: (options: ClientOptionHttpGet) => createPorter("get", options),
  post: (options: ClientOptionHttpPost) => createPorter("post", options),
  version
}
