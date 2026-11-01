/* eslint-disable no-undef */
/* eslint-disable n/no-unsupported-features/node-builtins */
export const EMBED_CHANNEL = "__animevsub_embed__" as const
export const EMBED_VERSION = 1 as const

export type EmbedRequestType = "ping" | "request" | "abort"
export type EmbedMessageType = EmbedRequestType | "ready" | "pong" | "response"

/**
 * Request payload sent from the parent page to the embedded animevietsub page.
 *
 * The embedded page performs the request with its own origin, so cookies and
 * the Referer header are exactly the same as a request made by animevietsub.
 */
export interface EmbedRequestOption {
  url: string
  method?: string
  cache?: RequestCache
  credentials?: RequestCredentials
  integrity?: string
  keepalive?: boolean
  mode?: RequestMode
  redirect?: RequestRedirect
  referrer?: string
  referrerPolicy?: ReferrerPolicy
  headers?: Record<string, string>
  data?:
    | string
    | Record<string, number | string | boolean>
    | FormData
    | URLSearchParams
    | Blob
    | ArrayBuffer
    | ArrayBufferView
  responseType?: "arraybuffer" | "json" | "text"
  /** Client side timeout in milliseconds. */
  timeout?: number
}

export interface EmbedRequestMessage {
  channel: typeof EMBED_CHANNEL
  version: number
  type: "request"
  id: string
  request: EmbedRequestOption
}

export interface EmbedAbortMessage {
  channel: typeof EMBED_CHANNEL
  version: number
  type: "abort"
  id: string
}

export interface EmbedPingMessage {
  channel: typeof EMBED_CHANNEL
  version: number
  type: "ping"
}

export type EmbedRequestMessageInput =
  | EmbedRequestMessage
  | EmbedAbortMessage
  | EmbedPingMessage

export interface EmbedResponseData {
  headers: Record<string, string>
  data: unknown
  url: string
  status: number
  statusText: string
}

export interface EmbedResponseMessage {
  channel: typeof EMBED_CHANNEL
  version: number
  type: "response"
  id: string
  ok: true
  response: EmbedResponseData
}

export interface EmbedErrorMessage {
  channel: typeof EMBED_CHANNEL
  version: number
  type: "response"
  id: string
  ok: false
  error: {
    name: string
    message: string
    stack?: string
  }
}

export type EmbedResponseMessageInput = EmbedResponseMessage | EmbedErrorMessage

export interface EmbedReadyMessage {
  channel: typeof EMBED_CHANNEL
  version: number
  type: "ready" | "pong"
}

export type EmbedMessage =
  | EmbedRequestMessageInput
  | EmbedResponseMessageInput
  | EmbedReadyMessage

export function isEmbedMessage(data: unknown): data is EmbedMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { channel?: unknown }).channel === EMBED_CHANNEL &&
    (data as { version?: unknown }).version === EMBED_VERSION
  )
}

export function serializeError(error: unknown): EmbedErrorMessage["error"] {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  }

  return {
    name: "Error",
    message: String(error)
  }
}

/**
 * Check if a hostname belongs to animevietsub (supports every TLD, e.g.
 * animevietsub.id, animevietsub.xyz, www.animevietsub.tv, ...).
 */
export function isAnimevietsubHost(hostname: string) {
  return /^(?:[a-z0-9-]+\.)*(?:animevietsub|googleapiscdn|fbcdns)\.[a-z0-9.-]+$/i.test(hostname)
}

/**
 * Match an origin against a list of patterns. A pattern can be an exact origin
 * ("https://animevsub.eu.org"), a wildcard ("*") or a subdomain wildcard
 * ("https://*.animevsub.eu.org").
 */
export function matchOrigin(origin: string, patterns: readonly string[]) {
  return patterns.some((pattern) => {
    if (pattern === "*") return true
    if (pattern === origin) return true
    if (!pattern.includes("*")) return false

    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")

    return new RegExp(`^${escaped}$`).test(origin)
  })
}
