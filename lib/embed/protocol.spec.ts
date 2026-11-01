import { describe, expect, test } from "vitest"

import { isAnimevietsubHost, matchOrigin } from "./protocol"

describe("isAnimevietsubHost", () => {
  test("matches animevietsub with any TLD", () => {
    expect(isAnimevietsubHost("animevietsub.id")).toBe(true)
    expect(isAnimevietsubHost("animevietsub.xyz")).toBe(true)
    expect(isAnimevietsubHost("www.animevietsub.tv")).toBe(true)
    expect(isAnimevietsubHost("m.animevietsub.pub")).toBe(true)
  })

  test("does not match other hosts", () => {
    expect(isAnimevietsubHost("animevsub.eu.org")).toBe(false)
    expect(isAnimevietsubHost("notanimevietsub.id")).toBe(false)
    expect(isAnimevietsubHost("animevietsub.co.uk")).toBe(true)
  })
})

describe("matchOrigin", () => {
  test("matches exact origin", () => {
    expect(
      matchOrigin("https://animevsub.eu.org", ["https://animevsub.eu.org"])
    ).toBe(true)
    expect(matchOrigin("https://evil.com", ["https://animevsub.eu.org"])).toBe(
      false
    )
  })

  test("matches wildcard", () => {
    expect(matchOrigin("https://anything.test", ["*"])).toBe(true)
    expect(
      matchOrigin("https://m.animevsub.eu.org", ["https://*.animevsub.eu.org"])
    ).toBe(true)
    expect(
      matchOrigin("https://animevsub.eu.org.evil.com", [
        "https://*.animevsub.eu.org"
      ])
    ).toBe(false)
  })
})
