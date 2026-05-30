import { describe, expect, it } from "vitest"

import { CountryStatsProvider } from "../src/country-stats"
import { Game } from "../src/game"
import { useDeterministicEngine, tickDays } from "./helpers"

describe("multi-country new games", () => {
  useDeterministicEngine({
    startDate: new Date("2026-05-29T08:00:00.000Z"),
    seed: 7,
  })

  it("creates a playable game for an uncurated nation", () => {
    const provider = new CountryStatsProvider()
    const stats = provider.fetchSync("KE")
    const game = Game.createNew({
      nation: "KE",
      stats,
      startedAt: new Date("2026-05-29T08:00:00.000Z"),
    })
    expect(game.nation).toBe("KE")
    expect(game.stats.name).toBe("Kenya")
    // 11 months after the start date.
    expect(game.electionDate).toBe("2027-04-29")
    expect(game.character).not.toBe("macron")
    expect(game.briefing.length).toBeGreaterThanOrEqual(1)
    expect(game.approval).toBeGreaterThan(0)
  })

  it("normalises the nation code to uppercase", () => {
    const game = Game.createNew({ nation: "us" })
    expect(game.nation).toBe("US")
  })

  it("derives a leader slug from the head of state", () => {
    const game = Game.createNew({
      nation: "ZA",
      stats: {
        ...new CountryStatsProvider().fetchSync("ZA"),
        government: {
          type: "Republic",
          headOfState: "Cyril Ramaphosa",
          headOfGovernment: "Cyril Ramaphosa",
          capital: "Pretoria",
        },
      },
    })
    expect(game.character).toBe("cyril-ramaphosa")
  })

  it("fires a synthesised terminal election at the mandate end", () => {
    const start = new Date("2026-05-29T08:00:00.000Z")
    let game = Game.createNew({
      nation: "KE",
      startedAt: start,
      electionDate: "2026-06-05",
    }).with({ paused: false })

    // Advance past the election date; the synthesised election should pause
    // the game for the player's decision.
    for (let i = 0; i < 10 && !game.pendingEvent && !game.gameOver; i++) {
      game = tickDays(game, 1)
    }
    expect(game.pendingEvent).not.toBeNull()
    expect(game.pendingEvent?.category).toBe("election")

    const choice = game.pendingEvent!.choices[0]!
    game = game.resolveEventChoice(game.pendingEvent!.id, choice.id)
    expect(game.gameOver).not.toBeNull()
    expect(["election_won", "election_lost"]).toContain(game.gameOver?.cause)
  })

  it("round-trips electionDate through a snapshot", () => {
    const game = Game.createNew({
      nation: "BR",
      startedAt: new Date("2026-05-29T08:00:00.000Z"),
    })
    const restored = Game.fromSnapshot(game.toSnapshot())
    expect(restored.electionDate).toBe(game.electionDate)
    expect(restored.nation).toBe("BR")
  })

  it("defaults legacy saves without an electionDate", () => {
    const snap = Game.createNew({ nation: "FR" }).toSnapshot()
    // Simulate a pre-multi-country save by dropping the field.
    const legacy = { ...snap } as Record<string, unknown>
    delete legacy.electionDate
    const restored = Game.fromSnapshot(legacy as never)
    expect(restored.electionDate).toBe("2027-04-25")
  })
})
