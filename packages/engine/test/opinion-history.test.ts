import { describe, expect, it } from "vitest"

import { Game } from "../src/game"
import { useDeterministicEngine, tickDays } from "./helpers"

useDeterministicEngine({
  startDate: new Date("2026-05-21T08:00:00.000Z"),
  seed: 91,
})

describe("opinion history snapshots", () => {
  it("captures per-AI opinion on weekly samples after relations exist", () => {
    let game = Game.createNew()
      .proposeAlliance("DE")
      .with({ paused: false })
    game = tickDays(game, 14)
    const sample = game.history[game.history.length - 1]
    expect(sample?.opinions).toBeDefined()
    // DE should now have a recorded opinion in the snapshot.
    expect(typeof sample?.opinions?.DE).toBe("number")
  })
})
