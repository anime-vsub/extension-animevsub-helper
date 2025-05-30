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
import type { RequestOption, RequestResponse } from "../background"
import { isFirefox } from "../env"
import { arrayBufferToBase64 } from "../logic/arrayBufferToBase64"
import { encodeDetail } from "../logic/encoder-detail"

import type { DetailCustomEvent_sendToInject } from "."

function patchWorker() {
  const OriginWorker = window.Worker

  class CORSWorker implements Worker {
    private realWorker: Worker | null = null
    private queue: Array<{ method: string; args: any[] }> = []

    private listeners: Map<string, Set<EventListenerOrEventListenerObject>> =
      new Map()

    private _onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null
    private _onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null =
      null

    private _onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null =
      null

    constructor(url: string, options?: WorkerOptions) {
      this.init(url, options)
    }

    private async init(url: string, options?: WorkerOptions) {
      try {
        const urlObj = url.startsWith("http") ? new URL(url) : undefined

        const res = await fetch(urlObj ? urlObj.pathname + urlObj.search : url)
        if (!res.ok) throw new Error(`Failed to fetch worker: ${res.status}`)

        const script = await res.text()
        const blob = new Blob([script], { type: "application/javascript" })
        const objectURL = URL.createObjectURL(blob)

        const real = new OriginWorker(objectURL, {
          type: "classic",
          ...options
        })

        this.realWorker = real

        real.addEventListener("message", (event) => {
          this._onmessage?.call(this, event)
          this.listeners.get("message")?.forEach((listener) => {
            if (typeof listener === "function") listener.call(this, event)
            else if (typeof listener.handleEvent === "function")
              listener.handleEvent(event)
          })
        })

        real.addEventListener("messageerror", (event) => {
          this._onmessageerror?.call(this, event)
          this.listeners.get("messageerror")?.forEach((listener) => {
            if (typeof listener === "function") listener.call(this, event)
            else if (typeof listener.handleEvent === "function")
              listener.handleEvent(event)
          })
        })

        real.addEventListener("error", (event) => {
          this._onerror?.call(this, event)
          this.listeners.get("error")?.forEach((listener) => {
            if (typeof listener === "function") listener.call(this, event)
            else if (typeof listener.handleEvent === "function")
              listener.handleEvent(event)
          })
        })

        this.queue.forEach(({ method, args }) => {
          // @ts-expect-error: dynamic call
          real[method](...args)
        })
        this.queue = []
      } catch (err) {
        console.error("CORSWorker init error:", err)
      }
    }

    postMessage(...args: any[]): void {
      // @ts-expect-error: dynamic call
      if (this.realWorker) this.realWorker.postMessage(...args)
      else this.queue.push({ method: "postMessage", args })
    }

    terminate(): void {
      if (this.realWorker) this.realWorker.terminate()
      else this.queue.push({ method: "terminate", args: [] })
    }

    get onmessage() {
      return this._onmessage
    }

    set onmessage(handler) {
      this._onmessage = handler
      if (this.realWorker) {
        this.realWorker.onmessage = (e) => {
          handler?.call(this, e)
          this.dispatchEvent(e)
        }
      }
    }

    get onerror() {
      return this._onerror
    }

    set onerror(handler) {
      this._onerror = handler
      if (this.realWorker) {
        this.realWorker.onerror = (e) => {
          handler?.call(this, e)
          this.dispatchEvent(e)
        }
      }
    }

    get onmessageerror() {
      return this._onmessageerror
    }

    set onmessageerror(handler) {
      this._onmessageerror = handler
      if (this.realWorker) {
        this.realWorker.onmessageerror = (e) => {
          handler?.call(this, e)
          this.dispatchEvent(e)
        }
      }
    }

    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject
    ): void {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set())

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.listeners.get(type)!.add(listener)
    }

    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject
    ): void {
      this.listeners.get(type)?.delete(listener)
    }

    dispatchEvent(event: Event): boolean {
      const type = event.type
      const listenerSet = this.listeners.get(type)
      if (!listenerSet) return true

      // eslint-disable-next-line functional/no-loop-statements
      for (const listener of listenerSet) {
        try {
          if (typeof listener === "function") listener.call(this, event)
          else if (typeof listener.handleEvent === "function")
            listener.handleEvent(event)
        } catch (err) {
          console.error("Error in event listener:", err)
        }
      }
      return true
    }
  }

  Object.assign(window, { Worker: CORSWorker })
}
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

    document.dispatchEvent(
      new CustomEvent<DetailCustomEvent_sendToInject>("http:response", {
        detail: encodeDetail(
          await fetch(detail.req.url, { ...detail.req, body: form, signal })
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
                case "json":
                  output.data = await res.json()
                  break
                default:
                  output.data = await res.text()
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
