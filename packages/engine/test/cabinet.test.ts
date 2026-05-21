import { describe, expect, it } from "vitest"

import { listMinisters } from "../src/cabinet"

describe("listMinisters", () => {
  it("returns a deep copy of the FR cabinet", () => {
    const a = listMinisters("FR")
    const b = listMinisters("FR")
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
    expect(a.length).toBeGreaterThan(3)
  })

  it("includes a prime minister", () => {
    const ministers = listMinisters("FR")
    expect(ministers.some((m) => m.role.toLowerCase().includes("prime"))).toBe(
      true
    )
  })

  it("returns empty for unknown nation", () => {
    expect(listMinisters("ZZ" as unknown as "FR")).toEqual([])
  })
})
