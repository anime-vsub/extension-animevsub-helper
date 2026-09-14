/* eslint-disable no-undef */

import { sendMessage } from "@tachibana-shin/webext-bridge/content-script"

import { version } from "../../package.json"
import { isFirefox } from "../env"
import { base64ToArrayBuffer } from "../logic/base64ToArrayBuffer"
import { encodeDetail } from "../logic/encoder-detail"
import type { RequestOption, RequestResponse } from "../types"
export type { DetailCustomEvent_sendToInject } from "../types"

document.addEventListener("http:request", (async ({
  detail
}: CustomEvent<{
  id: string
  req: RequestOption
}>) => {
  document.dispatchEvent(
    new CustomEvent<DetailCustomEvent_sendToInject>("http:response", {
      detail: encodeDetail(
        await (
          sendMessage(
            "http:request",
            detail.req
          ) as unknown as Promise<RequestResponse>
        )
          .then((res): DetailCustomEvent_sendToInject => {
            switch (detail.req.responseType) {
              case "arraybuffer":
                res.data = isFirefox
                  ? (res.data as string)
                  : base64ToArrayBuffer(res.data as string)
                break
              case "json":
                res.data = JSON.parse(res.data as string)
                break
            }

            return {
              id: detail.id,
              isBuffer: isFirefox && detail.req.responseType === "arraybuffer",
              ok: true,
              res
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
document.addEventListener("http:aborted", (({
  detail: { signalId }
}: CustomEvent<{ signalId: string }>) => {
  sendMessage("http:aborted", { signalId })
}) as unknown as EventListenerOrEventListenerObject)
document.addEventListener("tabs", (async ({
  detail
}: CustomEvent<{
  id: string
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
}>) => {
  document.dispatchEvent(
    new CustomEvent("tabs:response", {
      detail: encodeDetail(
        await sendMessage("tabs", detail)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then((res: any) => {
            return {
              id: detail.id,
              ok: true,
              res
            }
          })
          .catch((error) => {
            return {
              id: detail.id,
              ok: false,
              res: error
            }
          })
      )
    })
  )
}) as unknown as EventListenerOrEventListenerObject)
document.addEventListener("set:referrers", (async ({
  detail
}: CustomEvent<{
  id: string
  referrers: Record<string, string>
}>) => {
  await sendMessage("set:referrers", detail.referrers)
  document.dispatchEvent(
    new CustomEvent("res:set:referrers", {
      detail: encodeDetail({
        id: detail.id
      })
    })
  )
}) as unknown as EventListenerOrEventListenerObject)

document.documentElement.dataset.httpVersion = version
document.documentElement.dataset.httpAllow = JSON.stringify(true)
document.documentElement.dataset.tabsApi = JSON.stringify(true)
document.documentElement.dataset.customReferer = JSON.stringify(true)

function fixLegacyUrls(root: ParentNode = document) {
  try {
    root
      .querySelectorAll<HTMLImageElement | HTMLSourceElement>(
        'img[src*="animevietsub."], source[src*="animevietsub."]'
      )
      .forEach((el) => {
        if (el.src) {
          const newSrc = el.src
            .replace(
              /cdn\.animevietsub\.(?:pl|id|tv|net)/gi,
              "cdn.animevietsub.zip"
            )
            .replace(/:\/\/animevietsub\.pl/gi, "://animevietsub.zip")
          if (newSrc !== el.src) el.src = newSrc
        }
      })
    root
      .querySelectorAll<HTMLAnchorElement>('a[href*="animevietsub.pl"]')
      .forEach((el) => {
        if (el.href) {
          const newHref = el.href.replace(
            /:\/\/animevietsub\.pl/gi,
            "://animevietsub.zip"
          )
          if (newHref !== el.href) el.href = newHref
        }
      })
  } catch {
    // ignore
  }
}

window.addEventListener(
  "error",
  (event) => {
    const target = event.target as HTMLElement | null
    if (!target) return
    if (
      target instanceof HTMLImageElement ||
      target instanceof HTMLSourceElement
    ) {
      if (
        target.src &&
        (target.src.includes("cdn.animevietsub.") ||
          target.src.includes("://animevietsub.pl"))
      ) {
        const newSrc = target.src
          .replace(
            /cdn\.animevietsub\.(?:pl|id|tv|net)/gi,
            "cdn.animevietsub.zip"
          )
          .replace(/:\/\/animevietsub\.pl/gi, "://animevietsub.zip")
        if (newSrc !== target.src) target.src = newSrc
      }
    }
  },
  true
)

if (typeof document !== "undefined") {
  const initObserver = () => {
    fixLegacyUrls()
    const targetNode = document.body || document.documentElement
    if (targetNode) {
      new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === 1) fixLegacyUrls(node as ParentNode)
            }
          } else if (mutation.type === "attributes") {
            const el = mutation.target as HTMLElement
            if (
              el instanceof HTMLImageElement &&
              mutation.attributeName === "src" &&
              el.src
            ) {
              if (
                el.src.includes("cdn.animevietsub.") ||
                el.src.includes("://animevietsub.pl")
              ) {
                const newSrc = el.src
                  .replace(
                    /cdn\.animevietsub\.(?:pl|id|tv|net)/gi,
                    "cdn.animevietsub.zip"
                  )
                  .replace(/:\/\/animevietsub\.pl/gi, "://animevietsub.zip")
                if (newSrc !== el.src) el.src = newSrc
              }
            }
          }
        }
      }).observe(targetNode, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src"]
      })
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initObserver)
  } else {
    initObserver()
  }
}
