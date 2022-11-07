/* eslint-disable no-undef */
import type { OptionsHttpGet, OptionsHttpPost } from "../background"

import type { DetailCustomEvent } from "."

const randomUUID =
  (typeof crypto !== "undefined" ? crypto.randomUUID : undefined) ??
  (() => (+Math.random().toString().replace(".", "")).toString(34))

// eslint-disable-next-line @typescript-eslint/no-explicit-any, functional/immutable-data
;(window as any).Http = {
  get(options: OptionsHttpGet) {
    return new Promise((resolve, reject) => {
      const id = randomUUID()
      const handler = (({ detail }: CustomEvent<DetailCustomEvent>) => {
        if (detail.id === id) {
          if (detail.ok) resolve(detail.res)
          else reject(detail.res)
          document.removeEventListener("response:http-get", handler)
        }
      }) as EventListenerOrEventListenerObject
      document.addEventListener("response:http-get", handler)
      document.dispatchEvent(
        new CustomEvent("request:http-get", {
          detail: { id, ...options }
        })
      )
    })
  },
  post(options: OptionsHttpPost) {
    return new Promise((resolve, reject) => {
      const id = randomUUID()
      const handler = (({ detail }: CustomEvent<DetailCustomEvent>) => {
        if (detail.id === id) {
          if (detail.ok) resolve(detail.res)
          else reject(detail.res)
          document.removeEventListener("response:http-post", handler)
        }
      }) as EventListenerOrEventListenerObject
      document.addEventListener("response:http-post", handler)
      document.dispatchEvent(
        new CustomEvent("request:http-post", {
          detail: { id, ...options }
        })
      )
    })
  }
}
