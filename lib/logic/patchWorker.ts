/* eslint-disable functional/no-let */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */

export function patchWorker(
  target: any = typeof window !== "undefined" ? window : globalThis
) {
  const OriginWorker = target.Worker
  if (!OriginWorker || OriginWorker.__patched) return

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

    constructor(url: string | URL, options?: WorkerOptions) {
      this.init(String(url), options)
    }

    private async init(url: string, options?: WorkerOptions) {
      try {
        let fetchUrl = url
        try {
          const parsed = new URL(url, location.href)
          if (
            parsed.origin === location.origin ||
            (location.host.includes("animevietsub") &&
              parsed.host.includes("animevsub"))
          ) {
            fetchUrl = parsed.pathname + parsed.search
          }
        } catch (e) {}

        const res = await fetch(fetchUrl)
        if (!res.ok) throw new Error(`Failed to fetch worker: ${res.status}`)

        let script = await res.text()

        // 1. Bypass strict EXT-X-VERSION check in hls-parser inside the worker
        script = script.replace(
          /\(!u\.version\|\|u\.version\s*<\s*t\.compatibleVersion\)\s*&&\s*o\.INVALIDPLAYLIST\("EXT-X-VERSION needs to be/g,
          'false&&o.INVALIDPLAYLIST("EXT-X-VERSION needs to be'
        )
        script = script.replace(
          /o\.INVALIDPLAYLIST\(\s*["']EXT-X-VERSION needs to be/g,
          '(()=>{})("EXT-X-VERSION needs to be'
        )

        // 2. Resolve ffmpeg core/wasm assets to absolute URL if needed
        script = script.replace(
          /(["'])(\/assets\/ffmpeg-core-[^"']+)["']/g,
          "$1https://animevsub.eu.org$2$1"
        )

        // 3. Ensure playlist fetch in worker includes #animevsub-vsub_extra
        script = script.replace(
          /fetch\(([a-zA-Z0-9_]+)\)\.then\(([a-zA-Z0-9_]+)=>\2\.ok\?\2\.text\(\)/g,
          'fetch($1.includes("googleapiscdn.com")&&!$1.includes("#")?$1+"#animevsub-vsub_extra":$1).then($2=>$2.ok?$2.text()'
        )

        const workerPreamble = `
          // Injected by AnimeVsub Helper
          (function() {
            const _target = typeof self !== "undefined" ? self : this;
            const _origBtoa = _target.btoa;
            if (_origBtoa && !_origBtoa.__patched) {
              const _patchedBtoa = function(data) {
                const str = String(data);
                try {
                  return _origBtoa.call(_target, str);
                } catch(e) {
                  const bytes = new TextEncoder().encode(str);
                  let binary = "";
                  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                  return _origBtoa.call(_target, binary);
                }
              };
              _patchedBtoa.__patched = true;
              _target.btoa = _patchedBtoa;
            }

            const _origFetch = _target.fetch;
            if (_origFetch) {
              _target.fetch = async function(input, init) {
                let url = typeof input === "string" ? input : (input && input.url ? input.url : "");
                if (url && typeof url === "string") {
                  if (url.includes("googleapiscdn.com") && !url.includes("#")) {
                    url = url + "#animevsub-vsub_extra";
                    input = typeof input === "string" ? url : new Request(url, input);
                  }
                }
                const res = await _origFetch.call(_target, input, init);
                if (res && res.ok) {
                  const contentType = res.headers ? (res.headers.get("content-type") || "") : "";
                  const isM3U8 = (url && (url.includes(".m3u8") || url.includes("/hls/") || url.includes("playlist") || url.startsWith("data:application/vnd.apple.mpegurl"))) || contentType.includes("mpegurl");
                  if (isM3U8) {
                    try {
                      const text = await res.text();
                      if (text.includes("#EXTM3U")) {
                        let fixed = text;
                        if (/#EXT-X-VERSION:\\s*\\d+/i.test(fixed)) {
                          fixed = fixed.replace(/#EXT-X-VERSION:\\s*\\d+/i, "#EXT-X-VERSION:7");
                        } else {
                          fixed = fixed.replace("#EXTM3U", "#EXTM3U\\n#EXT-X-VERSION:7");
                        }
                        const headers = new Headers(res.headers);
                        headers.delete("content-length");
                        return new Response(fixed, {
                          status: res.status,
                          statusText: res.statusText,
                          headers
                        });
                      }
                      return new Response(text, {
                        status: res.status,
                        statusText: res.statusText,
                        headers: res.headers
                      });
                    } catch(e) {}
                  }
                }
                return res;
              };
            }
          })();
        `

        const patchedScript = workerPreamble + ";\n" + script
        const blob = new Blob([patchedScript], {
          type: "application/javascript"
        })
        const objectURL = URL.createObjectURL(blob)

        const real = new OriginWorker(objectURL, {
          type: "classic",
          ...options
        })

        this.realWorker = real

        real.addEventListener("message", (event) => {
          this.dispatchEvent(event)
        })

        real.addEventListener("messageerror", (event) => {
          this.dispatchEvent(event)
        })

        real.addEventListener("error", (event) => {
          this.dispatchEvent(event)
        })

        this.queue.forEach(({ method, args }) => {
          // @ts-expect-error dynamic call
          real[method](...args)
        })
        this.queue = []
      } catch (err) {
        console.warn(
          "[AnimeVsub Helper] CORSWorker init failed, falling back to OriginWorker:",
          err
        )
        try {
          const fallback = new OriginWorker(url, options)
          this.realWorker = fallback
          fallback.addEventListener("message", (e) => this.dispatchEvent(e))
          fallback.addEventListener("error", (e) => this.dispatchEvent(e))
          fallback.addEventListener("messageerror", (e) =>
            this.dispatchEvent(e)
          )
          this.queue.forEach(({ method, args }) => {
            // @ts-expect-error dynamic call
            fallback[method](...args)
          })
          this.queue = []
        } catch (fallbackErr) {
          console.error("Worker fallback failed:", fallbackErr)
        }
      }
    }

    postMessage(...args: any[]): void {
      // @ts-expect-error dynamic call
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
    }

    get onerror() {
      return this._onerror
    }

    set onerror(handler) {
      this._onerror = handler
    }

    get onmessageerror() {
      return this._onmessageerror
    }

    set onmessageerror(handler) {
      this._onmessageerror = handler
    }

    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject
    ): void {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set())
      this.listeners.get(type)!.add(listener)
    }

    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject
    ): void {
      this.listeners.get(type)?.delete(listener)
    }

    dispatchEvent(event: Event): boolean {
      if (event.type === "message" && this._onmessage) {
        try {
          this._onmessage.call(this, event as MessageEvent)
        } catch (e) {
          console.error(e)
        }
      } else if (event.type === "error" && this._onerror) {
        try {
          this._onerror.call(this, event as ErrorEvent)
        } catch (e) {
          console.error(e)
        }
      } else if (event.type === "messageerror" && this._onmessageerror) {
        try {
          this._onmessageerror.call(this, event as MessageEvent)
        } catch (e) {
          console.error(e)
        }
      }
      const listenerSet = this.listeners.get(event.type)
      if (listenerSet) {
        for (const listener of Array.from(listenerSet)) {
          try {
            if (typeof listener === "function") listener.call(this, event)
            else if (typeof (listener as any)?.handleEvent === "function")
              (listener as any).handleEvent(event)
          } catch (err) {
            console.error("Error in event listener:", err)
          }
        }
      }
      return !event.defaultPrevented
    }
  }

  ;(CORSWorker as any).__patched = true
  target.Worker = CORSWorker as any
}

export const patchWorkerCode = `(${patchWorker.toString()})();`

export function injectMainWorldWorkerPatch() {
  if (typeof document === "undefined") return

  const run = () => {
    const root = document.head || document.documentElement
    if (root) {
      const script = document.createElement("script")
      script.textContent = patchWorkerCode
      root.appendChild(script)
      script.remove()
      return true
    }
    return false
  }

  if (!run()) {
    const observer = new MutationObserver(() => {
      if (run()) observer.disconnect()
    })
    observer.observe(document, { childList: true })
  }
}
