import { describe, expect, it } from "vitest"

import { Game } from "../src/game"
import { useDeterministicEngine, tickDays } from "./helpers"

useDeterministicEngine({
  startDate: new Date("2026-05-21T08:00:00.000Z"),
  seed: 9,
})

describe("proactive warnings", () => {
  it("fires a single bankruptcy warning when treasury crosses the warn threshold", () => {
    let game = Game.createNew().with({ paused: false, treasury: -350_000 })
    game = tickDays(game, 5)
    if (game.pendingEvent) {
      game = game.resolveEventChoice(
        game.pendingEvent.id,
        game.pendingEvent.choices[0]!.id
      )
      game = game.with({ paused: false })
    }
    const warnings = game.briefing.filter(
      (b) => b.title === "Bercy warns: bond markets are nervous"
    )
    expect(warnings.length).toBeGreaterThanOrEqual(1)
    // Tick more without recovering — the warning should NOT fire again.
    game = tickDays(game.with({ treasury: -350_000 }), 5)
    const warningsAfter = game.briefing.filter(
      (b) => b.title === "Bercy warns: bond markets are nervous"
    )
    expect(warningsAfter.length).toBe(warnings.length)
  })

  it("fires an impeachment warning when approval crosses the warn threshold", () => {
    let game = Game.createNew().with({ paused: false, approval: 18 })
    game = tickDays(game, 5)
    const warnings = game.briefing.filter((b) =>
      b.title.includes("motion of censure")
    )
    expect(warnings.length).toBeGreaterThanOrEqual(1)
  })
})

describe("election countdown", () => {
  it("logs at least one election milestone in the final stretch", () => {
    let game = Game.createNew().with({
      paused: false,
      date: new Date("2027-04-01T08:00:00.000Z"),
    })
    // Walk forward day-by-day for ~3 weeks, auto-resolving events along the way.
    for (let i = 0; i < 21 && !game.gameOver; i++) {
      if (game.pendingEvent) {
        game = game.resolveEventChoice(
          game.pendingEvent.id,
          game.pendingEvent.choices[0]!.id
        )
        game = game.with({ paused: false })
        continue
      }
      game = tickDays(game, 1)
    }
    const countdownEntries = game.briefing.filter((b) =>
      /Election in /.test(b.title)
    )
    expect(countdownEntries.length).toBeGreaterThanOrEqual(1)
  })
})
