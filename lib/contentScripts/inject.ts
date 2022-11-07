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
  req: (OptionsHttpGet | OptionsHttpPost) & {
    method: string
  }
}
function createPorter(
  method: string,
  options: ClientOptionHttpGet | ClientOptionHttpPost
) {
  const rqOptions: typeof options & { method : typeof method } = {...options, method}
  return new Promise((resolve, reject) => {
    const id = randomUUID()
    const handler = (({
      detail
    }: CustomEvent<DetailCustomEvent_sendToInject>) => {
      if (detail.id === id) {
        if (detail.ok) resolve(detail.res)
        else reject(detail.res)
        document.removeEventListener("http:response", handler)
      }
    }) as EventListenerOrEventListenerObject
    document.addEventListener("http:response", handler)
    
    
    
      if (rqOptions.signal) {
        if (rqOptions.signal.aborted) {
          rqOptions.signalId = true
        } else {
          const signalId = randomUUID()
          // eslint-disable-next-line functional/immutable-data
          rqOptions.signal.onabort = () =>
            document.dispatchEvent(new CustomEvent("http:aborted", { detail: { signalId } }))
          rqOptions.signalId = signalId
        }
    
        // eslint-disable-next-line functional/immutable-data
        delete rqOptions.signal
      }
    
    document.dispatchEvent(
      new CustomEvent<DetailCustomEvent_sendToIndex>("http:request", {
        detail: { id, req: rqOptions }
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
