/* eslint-disable no-undef */
import type { OptionsHttpGet, OptionsHttpPost } from "~/background"

// eslint-disable-next-line functional/immutable-data
window.Http = {
  get(options: OptionsHttpGet) {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID()
      const handler = ({ detail }: Event) => {
        if (detail.id === id) {
          if (detail.ok) resolve(detail.res)
          else reject(detail.res)
          document.removeEventListener("response:http-get", handler)
        }
      }
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
      const id = crypto.randomUUID()
      const handler = ({ detail }: Event) => {
        if (detail.id === id) {
          if (detail.ok) resolve(detail.res)
          else reject(detail.res)
          document.removeEventListener("response:http-post", handler)
        }
      }
      document.addEventListener("response:http-post", handler)
      document.dispatchEvent(
        new CustomEvent("request:http-post", {
          detail: { id, ...options }
        })
      )
    })
  }
}
