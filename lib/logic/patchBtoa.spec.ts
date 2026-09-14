import { describe, expect, it } from "vitest"
import { patchBtoaCode } from "./patchBtoa"

describe("patchBtoa", () => {
  it("evaluates and patches btoa correctly for Unicode characters", () => {
    // Run the patch code in the current global environment
    eval(patchBtoaCode)

    const unicodeString = "Tiếng Việt - Anime Tập 1 🌸 #EXT-X-STREAM-INF"
    const base64 = btoa(unicodeString)
    expect(base64).toBeDefined()
    expect(typeof base64).toBe("string")

    // Decode and verify
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const decoded = new TextDecoder().decode(bytes)
    expect(decoded).toBe(unicodeString)
  })

  it("handles standard ASCII and Latin-1 strings correctly", () => {
    const asciiString = "Hello world! 12345"
    expect(btoa(asciiString)).toBe(Buffer.from(asciiString).toString("base64"))
  })
})
