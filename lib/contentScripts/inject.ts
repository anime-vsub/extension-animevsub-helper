/* eslint-disable camelcase */
/* eslint-disable no-undef */
import { version } from "../../package.json"
import type { RequestOption } from "../background"
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

export type BaseOption = Omit<ClientRequestOption, "method" | "data">
// eslint-disable-next-line @typescript-eslint/no-explicit-any, functional/immutable-data
;(window as any).Http = {
  get: (options: BaseOption) => createPorter("get", options),
  post: (
    options: BaseOption & {
      data?: RequestOption["data"]
    }
  ) => createPorter("post", options),
  version
}
