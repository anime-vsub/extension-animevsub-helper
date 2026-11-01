/* eslint-disable no-undef */
/* eslint-disable n/no-unsupported-features/node-builtins */
/* eslint-disable promise/catch-or-return */
/**
 * Page context bridge that is injected into every frame by `inject.ts`.
 *
 * - On `animevietsub.*` pages it listens for requests from the parent frame,
 *   executes them with the animevietsub origin (cookies + Referer included)
 *   and posts the response back.
 * - On every page it exposes `window.AnimeVsubEmbed`, the parent side helper.
 */
import { installEmbedGlobal } from "../embed/client"
import {
  EMBED_CHANNEL,
  EMBED_VERSION,
  isAnimevietsubHost,
  isEmbedMessage,
  matchOrigin,
  serializeError
} from "../embed/protocol"
import type {
  EmbedReadyMessage,
  EmbedRequestOption,
  EmbedResponseData,
  EmbedResponseMessageInput
} from "../embed/protocol"

const EMBED_ORIGINS_PARAM = "animevsub-embed-origins"

/**
 * Headers that the browser does not allow a page script to set. Cookies are
 * already sent automatically because the request runs inside animevietsub.
 */
const FORBIDDEN_HEADERS = new Set([
  "accept-encoding",
  "connection",
  "content-length",
  "cookie",
  "c-cookie",
  "host",
  "origin",
  "referer",
  "user-agent"
])

function getAllowedOrigins() {
  const raw = new URLSearchParams(location.search).get(EMBED_ORIGINS_PARAM)
  if (!raw) return ["*"]

  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)

  return origins.length > 0 ? origins : ["*"]
}

function isBodyInit(data: unknown): data is BodyInit {
  return (
    typeof data === "string" ||
    (typeof FormData !== "undefined" && data instanceof FormData) ||
    (typeof URLSearchParams !== "undefined" &&
      data instanceof URLSearchParams) ||
    (typeof Blob !== "undefined" && data instanceof Blob) ||
    data instanceof ArrayBuffer ||
    ArrayBuffer.isView(data)
  )
}

function createBody(
  data: EmbedRequestOption["data"]
): BodyInit | null | undefined {
  if (data === undefined || data === null) return undefined
  if (isBodyInit(data)) return data

  if (typeof data === "object") {
    const form = new FormData()

    Object.entries(data).forEach(([key, value]) =>
      form.append(key, String(value))
    )

    return form
  }

  return String(data)
}

function createHeaders(rawHeaders?: Record<string, string>) {
  const headers = new Headers()

  Object.entries(rawHeaders ?? {}).forEach(([name, value]) => {
    if (FORBIDDEN_HEADERS.has(name.toLowerCase())) return
    headers.set(name, value)
  })

  return headers
}

async function executeRequest(
  request: EmbedRequestOption,
  signal: AbortSignal
): Promise<EmbedResponseData> {
  const {
    url,
    data,
    responseType = "text",
    headers: rawHeaders,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    timeout: _timeout,
    ...init
  } = request

  const requestInit = init as RequestInit

  const response = await fetch(url, {
    ...requestInit,
    method: requestInit.method ?? "GET",
    headers: createHeaders(rawHeaders),
    body: createBody(data),
    credentials: requestInit.credentials ?? "include",
    signal
  })

  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  const output: EmbedResponseData = {
    headers,
    data: "",
    url: response.url,
    status: response.status,
    statusText: response.statusText
  }

  switch (responseType) {
    case "arraybuffer":
      output.data = await response.arrayBuffer()
      break
    case "json":
      output.data = await response.json()
      break
    default:
      output.data = await response.text()
  }

  return output
}

function installResponder() {
  if (window.parent === window) return

  const controllers = new Map<string, AbortController>()
  const allowedOrigins = getAllowedOrigins()

  const post = (
    message: EmbedReadyMessage | EmbedResponseMessageInput,
    targetOrigin = "*"
  ) => {
    try {
      window.parent.postMessage(message, targetOrigin)
    } catch {
      // The parent frame may already be gone.
    }
  }

  const postResponse = (message: EmbedResponseMessageInput, origin: string) => {
    post(message, origin && origin !== "null" ? origin : "*")
  }

  window.addEventListener("message", (event) => {
    // Only the direct parent frame is allowed to drive this bridge.
    if (event.source !== window.parent) return
    if (!matchOrigin(event.origin, allowedOrigins)) return
    if (!isEmbedMessage(event.data)) return

    const data = event.data

    if (data.type === "ping") {
      post(
        {
          channel: EMBED_CHANNEL,
          version: EMBED_VERSION,
          type: "ready"
        },
        event.origin && event.origin !== "null" ? event.origin : "*"
      )
      return
    }

    if (data.type === "abort") {
      controllers.get(data.id)?.abort()
      return
    }

    if (data.type !== "request") return

    const controller = new AbortController()
    controllers.set(data.id, controller)

    const timeout = data.request.timeout
    const timer =
      timeout && timeout > 0
        ? setTimeout(() => controller.abort(), timeout)
        : undefined

    executeRequest(data.request, controller.signal)
      .then((response) =>
        postResponse(
          {
            channel: EMBED_CHANNEL,
            version: EMBED_VERSION,
            type: "response",
            id: data.id,
            ok: true,
            response
          },
          event.origin
        )
      )
      .catch((error) =>
        postResponse(
          {
            channel: EMBED_CHANNEL,
            version: EMBED_VERSION,
            type: "response",
            id: data.id,
            ok: false,
            error: serializeError(error)
          },
          event.origin
        )
      )
      .finally(() => {
        if (timer !== undefined) clearTimeout(timer)
        controllers.delete(data.id)
      })
  })

  // Announce readiness. The parent also pings periodically, so it is fine if
  // this message is sent before the parent listener is installed.
  post({
    channel: EMBED_CHANNEL,
    version: EMBED_VERSION,
    type: "ready"
  })
}

// Make the helper available to every website (parent side).
installEmbedGlobal()

if (
  isAnimevietsubHost(location.hostname) &&
  (typeof document !== "undefined" ? document.documentElement : false)
) {
  document.documentElement.dataset.animevsubEmbed = String(EMBED_VERSION)
  installResponder()
}
