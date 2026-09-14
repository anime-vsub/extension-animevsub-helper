/* eslint-disable functional/no-let */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */

export function patchBtoa(
  target: any = typeof window !== "undefined" ? window : globalThis
) {
  const originBtoa = target.btoa
  if (!originBtoa || originBtoa.__patched) return

  const patchedBtoa = function (data: any): string {
    const str = String(data)
    try {
      return originBtoa.call(target, str)
    } catch (err: any) {
      if (
        err &&
        (err.name === "InvalidCharacterError" ||
          err.code === 5 ||
          String(err.message).includes("Latin1") ||
          String(err.message).includes("Invalid character"))
      ) {
        const bytes = new TextEncoder().encode(str)
        let binary = ""
        const len = bytes.byteLength
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        return originBtoa.call(target, binary)
      }
      throw err
    }
  }
  ;(patchedBtoa as any).__patched = true
  target.btoa = patchedBtoa
}

export const patchBtoaCode = `(${patchBtoa.toString()})();`

export function injectMainWorldBtoaPatch() {
  if (typeof document === "undefined") return

  const run = () => {
    const root = document.head || document.documentElement
    if (root) {
      const script = document.createElement("script")
      script.textContent = patchBtoaCode
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
