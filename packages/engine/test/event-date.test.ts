import { describe, expect, it } from "vitest"

import { getDueEvent, getNextEvent } from "../src/events"

describe("event date matching (UTC-safe)", () => {
  it("matches an event on its calendar date regardless of clock time-of-day", () => {
    // The 2026-07-08 heatwave should be due whether the in-game date is
    // 00:00 UTC, 12:00 UTC, or 23:59 UTC of that day.
    const fixtures = [
      "2026-07-08T00:00:00.000Z",
      "2026-07-08T12:00:00.000Z",
      "2026-07-08T23:59:00.000Z",
    ]
    for (const iso of fixtures) {
      const due = getDueEvent(new Date(iso), "FR", new Set())
      expect(due?.id).toBe("fr-2026-heatwave")
    }
  })

  it("does not return future events from getDueEvent", () => {
    const due = getDueEvent(
      new Date("2026-07-07T23:59:00.000Z"),
      "FR",
      new Set()
    )
    expect(due).toBeNull()
  })

  it("getNextEvent picks the soonest non-triggered event by UTC ordering", () => {
    const next = getNextEvent(
      new Date("2026-05-21T00:00:00.000Z"),
      "FR",
      new Set()
    )
    expect(next?.id).toBe("fr-2026-heatwave")
  })
})
