/* eslint-disable no-undef */
// eslint-disable-next-line n/no-unpublished-import
import { onMessage } from "webext-bridge"

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OptionsHttpGet = {
  url: string
  headers?: Record<string, string>
  responseType?: "arraybuffer"
}
onMessage<OptionsHttpGet, string>(
  "http:get",
  async ({ data: { url, headers, responseType } }) => {
    const res = await fetch(url, {
      headers: new Headers(headers)
    })

    return {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      // eslint-disable-next-line n/no-unsupported-features/es-builtins
      headers: Object.fromEntries(res.headers.entries()),
      data:
        responseType === "arraybuffer"
          ? await res.arrayBuffer()
          : await res.text(),
      url: res.url
    }
  }
)

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OptionsHttpPost = {
  url: string
  headers?: Record<string, string>
  responseType?: "arraybuffer"
  data?: Record<string, string>
}
onMessage<OptionsHttpPost, string>(
  "http:post",
  async ({ data: { url, headers, responseType, data } }) => {
    const form = new FormData()

    Object.entries(data ?? {}).forEach(([key, val]) => form.append(key, val))

    const res = await fetch(url, {
      method: "POST",
      headers: new Headers(headers),
      body: form
    })

    return {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      // eslint-disable-next-line n/no-unsupported-features/es-builtins
      headers: Object.fromEntries(res.headers.entries()),
      data:
        responseType === "arraybuffer"
          ? await res.arrayBuffer()
          : await res.text(),
      url: res.url
    }
  }
)
