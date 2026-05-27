import { describe, expect, it } from "vitest"

import { Game } from "../src/game"
import { useDeterministicEngine } from "./helpers"

useDeterministicEngine({
  startDate: new Date("2026-05-21T08:00:00.000Z"),
  seed: 21,
})

describe("Game.signTradeDeal", () => {
  it("requires opinion >= 20", () => {
    const game = Game.createNew()
      .with({
        relations: {
          DE: { opinion: 10, allied: false, lastInteractionAt: null },
        },
      })
    const next = game.signTradeDeal("DE")
    expect(next.treasury).toBe(game.treasury)
    expect(next.briefing[0]?.kind).toBe("warning")
    expect(next.briefing[0]?.title).toContain("refuses trade deal")
  })

  it("applies treasury, GDP, opinion deltas and stamps the cooldown", () => {
    const game = Game.createNew()
      .with({
        relations: {
          DE: { opinion: 50, allied: false, lastInteractionAt: null },
        },
      })
    const next = game.signTradeDeal("DE")
    const rel = next.getRelation("DE")
    expect(rel.opinion).toBeGreaterThan(50)
    expect(rel.lastEconomicActionAt).not.toBeNull()
    expect(next.treasury).toBeLessThan(game.treasury)
    expect(next.stats.economy.gdpUsd).toBeGreaterThan(
      game.stats.economy.gdpUsd
    )
    expect(
      next.briefing.find((b) => b.title.includes("Trade deal signed with DE"))
    ).toBeDefined()
  })

  it("respects the 90-day cooldown", () => {
    const game = Game.createNew().with({
      relations: {
        DE: {
          opinion: 50,
          allied: false,
          lastInteractionAt: null,
          lastEconomicActionAt: "2026-05-21T08:00:00.000Z",
        },
      },
    })
    const blocked = game.signTradeDeal("DE")
    expect(blocked.treasury).toBe(game.treasury)
    expect(blocked.briefing[0]?.title).toContain("Trade deal with DE blocked")
  })
})

describe("Game.issueSanctions", () => {
  it("applies costs, drops opinion, breaks the alliance", () => {
    const game = Game.createNew()
      .proposeAlliance("US")
    const before = game.getRelation("US")
    expect(before.allied).toBe(true)
    const next = game.issueSanctions("US")
    const after = next.getRelation("US")
    expect(after.allied).toBe(false)
    expect(after.opinion).toBeLessThan(before.opinion)
    expect(next.treasury).toBeLessThan(game.treasury)
    expect(
      next.briefing.find((b) => b.title.includes("Sanctions imposed on US"))
    ).toBeDefined()
  })

  it("respects the cooldown", () => {
    const game = Game.createNew().with({
      relations: {
        RU: {
          opinion: -40,
          allied: false,
          lastInteractionAt: null,
          lastEconomicActionAt: "2026-05-21T08:00:00.000Z",
        },
      },
    })
    const blocked = game.issueSanctions("RU")
    expect(blocked.treasury).toBe(game.treasury)
    expect(blocked.briefing[0]?.title).toContain("Sanctions on RU blocked")
  })
})
