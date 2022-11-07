import { describe, expect, test } from "vitest"

import { arrayBufferToBase64 } from "./arrayBufferToBase64"

describe("arrayBufferToBase64", () => {
  test("normal", () => {
    expect(
      arrayBufferToBase64(new Uint8Array([1, 3213, 534, 654, 768]).buffer)
    ).toBe("AY0WjgA=")
  })
})
