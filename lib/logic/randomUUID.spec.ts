import { describe, expect, test } from "vitest"

import { randomUUID } from "./randomUUID"

describe("randomUUID", () => {
  test("exists crypto", () => {
    expect(typeof randomUUID()).toBe("string")
  })
  test("not exists crypto", () => {
    // eslint-disable-next-line functional/immutable-data, n/no-unsupported-features/es-builtins, @typescript-eslint/no-explicit-any
    delete (globalThis as unknown as any).crypto
    expect(typeof randomUUID()).toBe("string")
  })
})
