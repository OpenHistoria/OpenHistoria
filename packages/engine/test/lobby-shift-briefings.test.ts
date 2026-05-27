import { describe, expect, it } from "vitest"

import { Game } from "../src/game"
import { defaultLobbies } from "../src/lobbies"
import { useDeterministicEngine, tickDays } from "./helpers"

useDeterministicEngine({
  startDate: new Date("2026-05-21T08:00:00.000Z"),
  seed: 53,
})

describe("lobby shift briefings", () => {
  it("emits a milestone when a lobby crosses 75", () => {
    // Pre-seed unions just above the trigger so a single tick lands them
    // there even without strong inflows.
    const game = Game.createNew().with({
      paused: false,
      lobbies: { ...defaultLobbies(), unions: 80 },
    })
    const next = tickDays(game, 1)
    const milestone = next.briefing.find((b) =>
      b.title.includes("Unions squarely behind")
    )
    expect(milestone).toBeDefined()
  })

  it("emits a warning when a lobby drops to 25 or below", () => {
    const game = Game.createNew().with({
      paused: false,
      lobbies: { ...defaultLobbies(), ecology: 10 },
    })
    const next = tickDays(game, 1)
    const warning = next.briefing.find((b) =>
      b.title.includes("Ecology turn against")
    )
    expect(warning).toBeDefined()
  })

  it("does not re-emit the same direction repeatedly", () => {
    let game = Game.createNew().with({
      paused: false,
      lobbies: { ...defaultLobbies(), military: 90 },
    })
    game = tickDays(game, 1)
    const first = game.briefing.filter((b) =>
      b.title.includes("Defence squarely behind")
    ).length
    game = tickDays(game, 5)
    const second = game.briefing.filter((b) =>
      b.title.includes("Defence squarely behind")
    ).length
    expect(second).toBe(first)
  })

  it("includes lobbies on weekly history samples", () => {
    let game = Game.createNew().with({ paused: false })
    game = tickDays(game, 14)
    const sample = game.history[game.history.length - 1]
    expect(sample?.lobbies).toBeDefined()
    expect(sample?.lobbies?.unions).toBeGreaterThanOrEqual(0)
    expect(sample?.lobbies?.unions).toBeLessThanOrEqual(100)
  })
})
