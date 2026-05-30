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

  it("synthesises generic stats for an uncurated nation", async () => {
    const sync = provider.fetchSync("KE" as NationCode)
    expect(sync.code).toBe("KE")
    expect(sync.name).toBe("Kenya")
    expect(sync.economy.gdpUsd).toBeGreaterThan(0)
    expect(sync.demographics.population).toBeGreaterThan(0)
    const async = await provider.fetch("KE" as NationCode)
    expect(async.code).toBe("KE")
  })
})
