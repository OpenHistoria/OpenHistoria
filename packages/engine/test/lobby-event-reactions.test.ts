import { describe, expect, it } from "vitest"

import { Game } from "../src/game"
import {
  applyLobbyEventReaction,
  defaultLobbies,
} from "../src/lobbies"
import { useDeterministicEngine } from "./helpers"

useDeterministicEngine({
  startDate: new Date("2026-05-21T08:00:00.000Z"),
  seed: 41,
})

describe("applyLobbyEventReaction", () => {
  it("social events with positive approval lift unions", () => {
    const before = defaultLobbies()
    const after = applyLobbyEventReaction(before, "social", { approval: 4 })
    expect(after.unions).toBeGreaterThan(before.unions)
  })

  it("scandal events erode public sector regardless of effects", () => {
    const before = defaultLobbies()
    const after = applyLobbyEventReaction(before, "scandal", {})
    expect(after.public_sector).toBeLessThan(before.public_sector)
  })

  it("economy choice that adds debt drags public sector", () => {
    const before = defaultLobbies()
    const after = applyLobbyEventReaction(before, "economy", {
      debtDelta: 0.5,
    })
    expect(after.public_sector).toBeLessThan(before.public_sector)
  })

  it("opportunity with GDP upside pleases industry", () => {
    const before = defaultLobbies()
    const after = applyLobbyEventReaction(before, "opportunity", {
      gdpDelta: 1000,
    })
    expect(after.industry).toBeGreaterThan(before.industry)
  })
})

describe("Game.resolveEventChoice", () => {
  it("applies the lobby reaction onto the next snapshot", () => {
    const game = Game.createNew().with({
      pendingEvent: {
        id: "test-scandal",
        nation: "FR",
        category: "scandal",
        severity: "high",
        date: "2026-08-01",
        title: "Test scandal",
        description: "",
        choices: [{ id: "ack", label: "Acknowledge", effects: {} }],
      },
    })
    const before = game.lobbies.public_sector
    const next = game.resolveEventChoice("test-scandal", "ack")
    expect(next.lobbies.public_sector).toBeLessThan(before)
  })
})
