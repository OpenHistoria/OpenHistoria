import { describe, expect, it } from "vitest"

import {
  EVENT_LIBRARY,
  getDueEvent,
  getEventsForNation,
  getNextEvent,
} from "../src/events"

describe("EVENT_LIBRARY", () => {
  it("contains the 2027 election as a terminal event", () => {
    const election = EVENT_LIBRARY.find((e) => e.category === "election")
    expect(election).toBeDefined()
    expect(election?.choices.some((c) => c.effects.terminal)).toBe(true)
  })

  it("every choice has a unique id within its event", () => {
    for (const ev of EVENT_LIBRARY) {
      const ids = new Set(ev.choices.map((c) => c.id))
      expect(ids.size).toBe(ev.choices.length)
    }
  })
})

describe("getEventsForNation", () => {
  it("returns a deep copy", () => {
    const copy = getEventsForNation("FR")
    copy[0]!.choices[0]!.effects.treasury = 999_999
    const fresh = getEventsForNation("FR")
    expect(fresh[0]!.choices[0]!.effects.treasury).not.toBe(999_999)
  })
})

describe("getNextEvent", () => {
  it("returns the soonest non-triggered event", () => {
    const next = getNextEvent(new Date("2026-05-01"), "FR", new Set())
    expect(next).not.toBeNull()
    expect(new Date(next!.date).getTime()).toBeGreaterThanOrEqual(
      new Date("2026-05-01").getTime()
    )
  })

  it("skips events already triggered", () => {
    const all = getEventsForNation("FR").sort((a, b) =>
      a.date.localeCompare(b.date)
    )
    const first = all[0]!
    const next = getNextEvent(new Date("2026-05-01"), "FR", new Set([first.id]))
    expect(next?.id).not.toBe(first.id)
  })
})

describe("getDueEvent", () => {
  it("returns null when no event is due", () => {
    const due = getDueEvent(new Date("2026-05-01"), "FR", new Set())
    expect(due).toBeNull()
  })

  it("returns the first matching past-due event", () => {
    const due = getDueEvent(new Date("2027-12-31"), "FR", new Set())
    expect(due).not.toBeNull()
  })
})
