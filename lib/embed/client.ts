/* eslint-disable no-undef */
/* eslint-disable functional/no-classes */
/* eslint-disable n/no-unsupported-features/node-builtins */
/**
 * Client (parent page) side of the AnimeVsub embed bridge.
 *
 * This module is framework agnostic and can be used either:
 * - from a website directly through `window.AnimeVsubEmbed.create(...)`
 *   (injected by the extension), or
 * - by importing it from `client-ext-animevsub-helper`.
 */
import {
  EMBED_CHANNEL,
  EMBED_VERSION,
  isAnimevietsubHost,
  isEmbedMessage,
  matchOrigin
} from "./protocol"
import type {
  EmbedErrorMessage,
  EmbedRequestOption,
  EmbedResponseData,
  EmbedResponseMessage
} from "./protocol"

export interface EmbedBridgeOptions {
  /** URL of the embedded page, e.g. `https://animevietsub.id/404`. */
  src: string
  /** Use an existing iframe instead of creating a new one. */
  iframe?: HTMLIFrameElement
  /** Element the iframe is appended to. Defaults to `document.body`. */
  container?: Element | null
  width?: number | string
  height?: number | string
  /** Keep the iframe in the DOM but make it invisible. */
  hidden?: boolean
  title?: string
  sandbox?: string
  className?: string
  attributes?: Record<string, string>
  /** Default request timeout in milliseconds. */
  timeout?: number
  /** How long to wait for the embedded page to become ready. */
  readyTimeout?: number
  /**
   * Origins allowed to answer. Defaults to the iframe origin, and hosts under
   * `animevietsub.*` are always accepted so provider redirects keep working.
   */
  allowedOrigins?: string[]
  /** Accept messages after the iframe redirects to another animevietsub host. */
  allowAnimevietsubRedirects?: boolean
}

export interface EmbedClientRequestOption extends EmbedRequestOption {
  signal?: AbortSignal
}

export interface EmbedBridgeResponse<T = unknown>
  extends Omit<EmbedResponseData, "data"> {
  data: T
}

export interface EmbedBridge {
  readonly iframe: HTMLIFrameElement
  readonly origin: string
  readonly ready: Promise<void>
  request<T = unknown>(
    options: EmbedClientRequestOption
  ): Promise<EmbedBridgeResponse<T>>
  get<T = unknown>(
    url: string,
    options?: Omit<EmbedClientRequestOption, "url" | "method">
  ): Promise<EmbedBridgeResponse<T>>
  post<T = unknown>(
    url: string,
    data?: EmbedClientRequestOption["data"],
    options?: Omit<EmbedClientRequestOption, "url" | "method" | "data">
  ): Promise<EmbedBridgeResponse<T>>
  destroy(): void
}

// eslint-disable-next-line functional/no-mixed-types
interface PendingRequest {
  resolve: (value: EmbedResponseMessage) => void
  reject: (reason: unknown) => void
  timer: ReturnType<typeof setTimeout>
}

function randomId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  )
    return crypto.randomUUID()

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function toCssSize(value: number | string) {
  return typeof value === "number" ? `${value}px` : value
}

class EmbedBridgeImpl implements EmbedBridge {
  readonly iframe: HTMLIFrameElement
  readonly origin: string
  readonly ready: Promise<void>

  private readonly ownIframe: boolean
  private readonly timeout: number
  private readonly readyTimeout: number
  private readonly allowedOrigins: string[]
  private readonly allowAnimevietsubRedirects: boolean
  private readonly pending = new Map<string, PendingRequest>()

  private readonly onMessageBound = (event: MessageEvent) =>
    this.onMessage(event)

  private readonly onLoadBound = () => this.ping()

  private resolveReady!: () => void
  private rejectReady!: (reason: Error) => void
  private targetOrigin: string
  private responseOrigin: string | undefined
  private pingTimer: ReturnType<typeof setInterval> | undefined
  private readyTimer: ReturnType<typeof setTimeout> | undefined
  private destroyed = false

  constructor(options: EmbedBridgeOptions) {
    this.iframe = options.iframe ?? document.createElement("iframe")
    this.ownIframe = !options.iframe
    this.timeout = options.timeout ?? 30_000
    this.readyTimeout = options.readyTimeout ?? 15_000
    this.allowAnimevietsubRedirects = options.allowAnimevietsubRedirects ?? true

    this.ready = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve
      this.rejectReady = reject
    })
    // Avoid unhandled rejection warnings for consumers that only call get/post.
    this.ready.catch(() => undefined)

    this.origin = new URL(options.src, location.href).origin
    this.targetOrigin = this.origin === "null" ? "*" : this.origin
    this.allowedOrigins = options.allowedOrigins ?? [this.origin]

    this.configureIframe(options)
    this.iframe.addEventListener("load", this.onLoadBound)
    window.addEventListener("message", this.onMessageBound)

    this.startPing()

    if (this.iframe.parentNode === null) {
      const container =
        options.container ?? document.body ?? document.documentElement
      container?.append(this.iframe)
    }
  }

  private configureIframe(options: EmbedBridgeOptions) {
    const iframe = this.iframe
    iframe.src = options.src

    if (options.title) iframe.title = options.title
    else if (!iframe.title) iframe.title = "AnimeVsub embed bridge"

    if (options.sandbox) iframe.setAttribute("sandbox", options.sandbox)
    if (options.className) iframe.className = options.className

    Object.entries(options.attributes ?? {}).forEach(([name, value]) => {
      iframe.setAttribute(name, value)
    })

    const style = iframe.style
    style.border = "0"

    if (options.hidden) {
      style.position = "fixed"
      style.left = "-9999px"
      style.top = "-9999px"
      style.width = "0"
      style.height = "0"
      style.opacity = "0"
      style.pointerEvents = "none"
    } else {
      if (options.width !== undefined) style.width = toCssSize(options.width)
      if (options.height !== undefined) style.height = toCssSize(options.height)
    }
  }

  private startPing() {
    this.ping()
    this.pingTimer = setInterval(() => this.ping(), 250)
    this.readyTimer = setTimeout(() => {
      this.clearTimers()
      this.rejectReady(
        new Error(
          "AnimeVsub embed bridge did not respond. Make sure AnimeVsub Helper is installed and the embedded page allows framing."
        )
      )
    }, this.readyTimeout)
  }

  private clearTimers() {
    if (this.pingTimer !== undefined) {
      clearInterval(this.pingTimer)
      this.pingTimer = undefined
    }
    if (this.readyTimer !== undefined) {
      clearTimeout(this.readyTimer)
      this.readyTimer = undefined
    }
  }

  private markReady() {
    this.clearTimers()
    this.resolveReady()
  }

  private ping() {
    if (this.destroyed) return

    // Pings carry no data, so they can use "*" to discover the real origin
    // after a possible redirect.
    this.iframe.contentWindow?.postMessage(
      {
        channel: EMBED_CHANNEL,
        version: EMBED_VERSION,
        type: "ping"
      },
      "*"
    )
  }

  private isAllowedOrigin(origin: string) {
    if (matchOrigin(origin, this.allowedOrigins)) return true
    if (!this.allowAnimevietsubRedirects) return false

    try {
      return isAnimevietsubHost(new URL(origin).hostname)
    } catch {
      return false
    }
  }

  private onMessage(event: MessageEvent) {
    if (this.destroyed) return
    if (event.source !== this.iframe.contentWindow) return
    if (!this.isAllowedOrigin(event.origin)) return
    if (!isEmbedMessage(event.data)) return

    const data = event.data

    if (data.type === "ready" || data.type === "pong") {
      this.responseOrigin = event.origin
      this.markReady()
      return
    }

    if (data.type !== "response") return

    this.responseOrigin = event.origin

    const pending = this.pending.get(data.id)
    if (!pending) return

    this.pending.delete(data.id)
    clearTimeout(pending.timer)

    if (data.ok) pending.resolve(data)
    else pending.reject(toError(data))
  }

  request<T = unknown>(
    options: EmbedClientRequestOption
  ): Promise<EmbedBridgeResponse<T>> {
    if (this.destroyed)
      return Promise.reject(new Error("Embed bridge was destroyed."))

    const { signal, ...request } = options

    return this.ready.then(
      () =>
        new Promise<EmbedBridgeResponse<T>>((resolve, reject) => {
          const id = randomId()
          const timeout = request.timeout ?? this.timeout
          const timer = setTimeout(() => {
            this.pending.delete(id)
            reject(
              new Error(
                `Embed request timed out after ${timeout}ms: ${request.url}`
              )
            )
          }, timeout)

          const cleanupAbort = () => {
            signal?.removeEventListener("abort", onAbort)
          }

          const onAbort = () => {
            this.pending.delete(id)
            clearTimeout(timer)
            cleanupAbort()
            try {
              this.iframe.contentWindow?.postMessage(
                {
                  channel: EMBED_CHANNEL,
                  version: EMBED_VERSION,
                  type: "abort",
                  id
                },
                this.responseOrigin ?? this.targetOrigin
              )
            } catch {
              // The iframe may already be gone.
            }
            reject(new DOMException("The request was aborted.", "AbortError"))
          }

          if (signal?.aborted) {
            onAbort()
            return
          }

          signal?.addEventListener("abort", onAbort, { once: true })

          this.pending.set(id, {
            resolve: (message) => {
              cleanupAbort()
              resolve(message.response as EmbedBridgeResponse<T>)
            },
            reject: (reason) => {
              cleanupAbort()
              reject(reason)
            },
            timer
          })

          const target = this.iframe.contentWindow
          if (!target) {
            this.pending.delete(id)
            clearTimeout(timer)
            cleanupAbort()
            reject(new Error("The embedded iframe is not available."))
            return
          }

          try {
            target.postMessage(
              {
                channel: EMBED_CHANNEL,
                version: EMBED_VERSION,
                type: "request",
                id,
                request
              },
              this.responseOrigin ?? this.targetOrigin
            )
          } catch (error) {
            this.pending.delete(id)
            clearTimeout(timer)
            cleanupAbort()
            reject(error)
          }
        })
    )
  }

  get<T = unknown>(
    url: string,
    options?: Omit<EmbedClientRequestOption, "url" | "method">
  ) {
    return this.request<T>({ ...options, url, method: "GET" })
  }

  post<T = unknown>(
    url: string,
    data?: EmbedClientRequestOption["data"],
    options?: Omit<EmbedClientRequestOption, "url" | "method" | "data">
  ) {
    return this.request<T>({ ...options, url, method: "POST", data })
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true

    this.clearTimers()
    this.rejectReady(new Error("Embed bridge was destroyed."))
    window.removeEventListener("message", this.onMessageBound)
    this.iframe.removeEventListener("load", this.onLoadBound)

    this.pending.forEach((pending) => {
      clearTimeout(pending.timer)
      pending.reject(new Error("Embed bridge was destroyed."))
    })
    this.pending.clear()

    if (this.ownIframe) this.iframe.remove()
  }
}

function toError(data: EmbedErrorMessage) {
  const error = new Error(data.error.message)
  error.name = data.error.name
  if (data.error.stack) error.stack = data.error.stack
  return error
}

export function createEmbedBridge(options: EmbedBridgeOptions): EmbedBridge {
  return new EmbedBridgeImpl(options)
}

export interface AnimeVsubEmbedGlobal {
  version: number
  channel: string
  create: typeof createEmbedBridge
}

/** Expose the helper on `window.AnimeVsubEmbed` for plain websites. */
export function installEmbedGlobal(): AnimeVsubEmbedGlobal {
  const api: AnimeVsubEmbedGlobal = {
    version: EMBED_VERSION,
    channel: EMBED_CHANNEL,
    create: createEmbedBridge
  }

  Object.assign(window, { AnimeVsubEmbed: api })

  return api
}
