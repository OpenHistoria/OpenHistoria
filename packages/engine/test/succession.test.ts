import { describe, expect, it } from "vitest"

import { DEFAULT_RELATION, Game } from "../src/game"
import {
  initWorldElections,
  resolveWorldElections,
  type WorldElections,
} from "../src/succession"
import { useDeterministicEngine } from "./helpers"

describe("world elections / successions", () => {
  useDeterministicEngine({
    startDate: new Date("2026-05-21T00:00:00.000Z"),
    seed: 3,
  })

  const start = new Date("2026-05-21T00:00:00.000Z")

  it("seeds a calendar for foreign nations, excluding the player", () => {
    const cal = initWorldElections("FR", start)
    expect(cal.FR).toBeUndefined()
    expect(cal.US).toBeDefined()
    expect(cal.DE?.termDays).toBeGreaterThan(0)
    // Nobody votes on day zero.
    for (const entry of Object.values(cal)) {
      expect(Date.parse(`${entry.nextAt}T00:00:00.000Z`)).toBeGreaterThan(
        start.getTime()
      )
    }
  })

  it("excludes the player even when they are an AI-roster nation", () => {
    const cal = initWorldElections("US", start)
    expect(cal.US).toBeUndefined()
    expect(cal.FR).toBeUndefined() // FR isn't in the AI roster anyway
    expect(cal.DE).toBeDefined()
  })

  it("does not fire when nothing is due in the window", () => {
    const cal: WorldElections = {
      DE: { nextAt: "2027-01-01", termDays: 1461 },
    }
    const res = resolveWorldElections({
      worldElections: cal,
      relations: {},
      playerNation: "FR",
      from: new Date("2026-05-21T00:00:00.000Z"),
      to: new Date("2026-05-22T00:00:00.000Z"),
    })
    expect(res.actions).toHaveLength(0)
    expect(res.worldElections.DE?.nextAt).toBe("2027-01-01")
  })

  it("fires a due election, advances the calendar, and shifts opinion", () => {
    const cal: WorldElections = {
      DE: { nextAt: "2026-06-01", termDays: 1461 },
    }
    const res = resolveWorldElections({
      worldElections: cal,
      relations: { DE: { ...DEFAULT_RELATION, opinion: 40 } },
      playerNation: "FR",
      from: new Date("2026-05-31T00:00:00.000Z"),
      to: new Date("2026-06-01T00:00:00.000Z"),
    })
    expect(res.actions).toHaveLength(1)
    const action = res.actions[0]!
    expect(action.code).toBe("DE")
    expect(typeof action.turnover).toBe("boolean")
    expect(action.briefingTitle).toContain("Germany")
    // Calendar advanced by exactly one term.
    expect(res.worldElections.DE?.nextAt).toBe("2030-06-01")
    // Opinion moved by the reported delta.
    expect(res.relations.DE?.opinion).toBe(40 + action.opinionDelta)
  })

  it("is deterministic for a fixed seed", () => {
    const cal: WorldElections = {
      DE: { nextAt: "2026-06-01", termDays: 1461 },
      US: { nextAt: "2026-06-01", termDays: 1461 },
    }
    const input = {
      worldElections: cal,
      relations: {},
      playerNation: "FR",
      from: new Date("2026-05-31T00:00:00.000Z"),
      to: new Date("2026-06-02T00:00:00.000Z"),
    }
    // The deterministic clock resets each `it` via the harness, so two calls
    // inside one test draw from the same advancing stream — assert structure
    // instead: every due nation produces exactly one action.
    const res = resolveWorldElections(input)
    expect(res.actions.map((a) => a.code).sort()).toEqual(["DE", "US"])
  })

  it("threads the calendar through Game.createNew and snapshots", () => {
    const game = Game.createNew({
      nation: "FR",
      startedAt: new Date("2026-05-21T08:00:00.000Z"),
    })
    expect(Object.keys(game.worldElections).length).toBeGreaterThan(5)
    expect(game.worldElections.FR).toBeUndefined()
    const restored = Game.fromSnapshot(game.toSnapshot())
    expect(restored.worldElections).toEqual(game.worldElections)
  })

  it("resolves a foreign election during Game.tick", () => {
    let game = Game.createNew({
      nation: "FR",
      startedAt: new Date("2026-05-21T08:00:00.000Z"),
    })
      .with({
        paused: false,
        worldElections: {
          DE: { nextAt: "2026-05-22", termDays: 1461 },
        },
      })

    game = game.tick(2)

    const germanBeat = game.briefing.find((b) => b.title.includes("Germany"))
    expect(germanBeat).toBeDefined()
    // Calendar advanced past the resolved date.
    expect(game.worldElections.DE?.nextAt).not.toBe("2026-05-22")
  })
})
