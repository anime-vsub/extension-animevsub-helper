/* eslint-disable no-useless-call */

/* eslint-disable n/no-unsupported-features/es-builtins */
/* eslint-disable camelcase */
/* eslint-disable functional/functional-parameters */
/* eslint-disable n/no-unsupported-features/node-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable functional/no-classes */
/* eslint-disable no-undef */
/// <reference lib="dom" />

import { version } from "../../package.json"
import { isFirefox } from "../env"
import { arrayBufferToBase64 } from "../logic/arrayBufferToBase64"
import { encodeDetail } from "../logic/encoder-detail"
import { patchBtoa } from "../logic/patchBtoa"
import { patchWorker } from "../logic/patchWorker"
import type {
  DetailCustomEvent_sendToInject,
  RequestOption,
  RequestResponse
} from "../types"

// Apply btoa patch in main world immediately
patchBtoa()
function patchAnimeVsubHelper() {
  const eventsAbort = new (class EventsAbort {
    // eslint-disable-next-line func-call-spacing
    readonly store = new Map<string, () => void>()

    on(id: string, fn: () => void) {
      this.store.set(id, fn)

      return () => this.store.delete(id)
    }
  })()

  document.addEventListener("http:aborted", (({
    detail: { signalId }
  }: CustomEvent<{ signalId: string }>) => {
    eventsAbort.store.get(signalId)?.()
  }) as unknown as EventListenerOrEventListenerObject)

  document.addEventListener("http:request", (async ({
    detail
  }: CustomEvent<{
    id: string
    req: RequestOption
  }>) => {
    // eslint-disable-next-line functional/no-let
    let form: FormData | string | undefined
    const { data, signalId } = detail.req
    if (data) {
      if (typeof data === "object") {
        form = new FormData()

        Object.entries(data ?? {}).forEach(([key, val]) =>
          (form as FormData).append(key, val as string)
        )
      } else {
        form = data
      }
    }

    // eslint-disable-next-line functional/no-let
    let signal: AbortSignal | undefined
    // eslint-disable-next-line functional/no-let
    let cancelAbort: (() => void) | undefined

    if (signalId) {
      const controller = new AbortController()
      signal = controller.signal
      if (signalId === true) {
        controller.abort()
      } else {
        // init abortcontroller
        cancelAbort = eventsAbort.on(signalId, () => {
          controller.abort()
          cancelAbort?.()
        })
      }
    }

    const targetUrl = detail.req.url
      .replace(
        /^https?:\/\/cdn\.animevietsub\.[^/]+/i,
        "https://cdn.animevietsub.zip"
      )
      .replace(/^https?:\/\/animevietsub\.[^/]+/i, "https://animevietsub.zip")

    document.dispatchEvent(
      new CustomEvent<DetailCustomEvent_sendToInject>("http:response", {
        detail: encodeDetail(
          await fetch(targetUrl, { ...detail.req, body: form, signal })
            .then(async (res): Promise<DetailCustomEvent_sendToInject> => {
              const output: RequestResponse = {
                headers: Object.fromEntries(
                  (res.headers as unknown as any).entries()
                ),
                data: "",
                url: res.url,
                status: res.status
              }

              switch (detail.req.responseType) {
                case "arraybuffer":
                  output.data = isFirefox
                    ? await res.text()
                    : arrayBufferToBase64(await res.arrayBuffer())
                  break
                case "json": {
                  const text = await res.text()
                  const cleaned = text
                    .replace(
                      /cdn\.animevietsub\.(?:pl|id|tv|net)/gi,
                      "cdn.animevietsub.zip"
                    )
                    .replace(/:\/\/animevietsub\.pl/gi, "://animevietsub.zip")
                  output.data = JSON.parse(cleaned)
                  break
                }
                default: {
                  const text = await res.text()
                  output.data = text
                    .replace(
                      /cdn\.animevietsub\.(?:pl|id|tv|net)/gi,
                      "cdn.animevietsub.zip"
                    )
                    .replace(/:\/\/animevietsub\.pl/gi, "://animevietsub.zip")
                }
              }

              return {
                id: detail.id,
                isBuffer:
                  isFirefox && detail.req.responseType === "arraybuffer",
                ok: true,
                res: output
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

  document.documentElement.dataset.httpVersion = version
  document.documentElement.dataset.httpAllow = JSON.stringify(true)
  document.documentElement.dataset.tabsApi = JSON.stringify(false)
  document.documentElement.dataset.customReferer = JSON.stringify(false)
}

async function patchWebsite() {
  const url = (window as unknown as any).patcher ?? "https://animevsub.eu.org"

  document.documentElement.innerHTML = ""
  const html = await fetch(url).then((res) => res.text())

  document.documentElement.innerHTML = `<base href="${url}" />${html}`
  document.querySelectorAll("script").forEach((script) => {
    if (script.src.includes("adguard")) return

    const scriptReal = document.createElement("script")
    scriptReal.innerHTML = script.innerHTML
    scriptReal.src = script.src
    scriptReal.type = script.type
    script.replaceWith(scriptReal)
  })
}

function patch() {
  patchWorker()
  patchAnimeVsubHelper()
  patchWebsite()
}

if (new URLSearchParams(location.search.slice(1)).get("patch") === "true")
  localStorage.setItem("patch", "true")

if (
  location.host.startsWith("animevietsub") &&
  localStorage.getItem("patch") === "true"
) {
  // eslint-disable-next-line no-inner-declarations
  function emit() {
    if (document.documentElement.innerHTML.includes("Trang chủ")) patch()
  }
  document.addEventListener("DOMContentLoaded", emit)
  addEventListener("load", emit)
  emit()
}
