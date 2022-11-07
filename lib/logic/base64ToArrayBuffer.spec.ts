import { describe, expect, test } from "vitest"

import { base64ToArrayBuffer } from "./base64ToArrayBuffer"

describe("arrayBufferToBase64", () => {
  test("normal", () => {
    expect(base64ToArrayBuffer("AY0WjgA=")).toEqual(
      new Uint8Array([1, 3213, 534, 654, 768]).buffer
    )
  })
})
