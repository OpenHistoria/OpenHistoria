import {
  buildCountryStats,
  fetchCountryData,
  synthesizeCountryStats,
  type CountryStats,
  type NewGameOptions,
} from "@workspace/engine"

interface LeadersResponse {
  headOfState?: { name: string | null } | null
  headOfGovernment?: { name: string | null } | null
}

async function fetchLeaders(
  code: string
): Promise<{ headOfState?: string | null; headOfGovernment?: string | null } | null> {
  try {
    const res = await fetch(`/api/head-of-state?code=${encodeURIComponent(code)}`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    const body = (await res.json()) as LeadersResponse
    return {
      headOfState: body.headOfState?.name ?? null,
      headOfGovernment: body.headOfGovernment?.name ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Assemble the options for a brand-new game in any country, starting *now*.
 *
 * France keeps its curated roster + hand-authored 2027 election (the engine
 * recognises "FR" and fills those in). Every other country is enriched from
 * live World Bank + Wikidata data when the network is reachable, and falls
 * back to deterministic synthesised stats otherwise — so the new game always
 * succeeds.
 */
export async function buildNewGameOptions(input: {
  code: string
  name: string
}): Promise<NewGameOptions> {
  const nation = input.code.trim().toUpperCase()
  const startedAt = new Date()

  if (nation === "FR") {
    return { nation, startedAt }
  }

  const [fetched, leaders] = await Promise.all([
    fetchCountryData(nation).catch(() => null),
    fetchLeaders(nation),
  ])

  let stats: CountryStats
  if (fetched) {
    stats = buildCountryStats(fetched, leaders ?? undefined)
  } else {
    stats = synthesizeCountryStats(nation, input.name)
    if (leaders?.headOfState) {
      stats.government.headOfState = leaders.headOfState
      stats.government.headOfGovernment =
        leaders.headOfGovernment ?? leaders.headOfState
    }
  }

  return { nation, stats, startedAt }
}
