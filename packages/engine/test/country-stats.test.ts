import { describe, expect, it } from "vitest"

import { CountryStatsProvider, type NationCode } from "../src"

describe("CountryStatsProvider", () => {
  const provider = new CountryStatsProvider()

  it("returns France stats synchronously", () => {
    const stats = provider.fetchSync("FR")
    expect(stats.name).toBe("France")
    expect(stats.economy.gdpUsd).toBeGreaterThan(0)
  })

  it("returns a deep copy each call", () => {
    const a = provider.fetchSync("FR")
    a.economy.gdpUsd = 1
    const b = provider.fetchSync("FR")
    expect(b.economy.gdpUsd).not.toBe(1)
  })

  it("answers has() correctly", () => {
    expect(provider.has("FR")).toBe(true)
    expect(provider.has("ZZ" as NationCode)).toBe(false)
  })

  it("returns stats via async fetch as well", async () => {
    const stats = await provider.fetch("FR")
    expect(stats.code).toBe("FR")
  })

  it("throws for unknown nation", async () => {
    await expect(provider.fetch("ZZ" as NationCode)).rejects.toThrow()
    expect(() => provider.fetchSync("ZZ" as NationCode)).toThrow()
  })
})
