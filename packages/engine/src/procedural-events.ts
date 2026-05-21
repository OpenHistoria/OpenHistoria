import { getClock } from "./clock"
import type {
  EventDefinition,
  EventCategory,
  EventChoice,
} from "./events"
import type { NationCode } from "./game"

interface ProceduralTemplate {
  id: string
  category: EventCategory
  title: string
  description: string
  choices: EventChoice[]
  weight: number
}

const FR_TEMPLATES: ProceduralTemplate[] = [
  {
    id: "minor-farmer-protest",
    category: "social",
    weight: 3,
    title: "Farmers block the A1 motorway",
    description:
      "FNSEA blocks traffic on the A1 demanding emergency price support. Disruption is regional but televised.",
    choices: [
      {
        id: "subsidise",
        label: "Release €400M in emergency aid",
        effects: { treasury: -400, approval: 2 },
      },
      {
        id: "negotiate",
        label: "Send the agriculture minister to negotiate",
        effects: { approval: -1 },
      },
      {
        id: "police",
        label: "Order gendarmerie to clear the road",
        effects: { approval: -4 },
      },
    ],
  },
  {
    id: "minor-tech-deal",
    category: "opportunity",
    weight: 2,
    title: "Major tech firm considers a French HQ",
    description:
      "A US semiconductor company explores a European HQ in Grenoble. The decision hinges on tax incentives.",
    choices: [
      {
        id: "incentives",
        label: "Offer €800M in tax credits",
        effects: { treasury: -800, gdpDelta: 1800, unemploymentDelta: -0.05 },
      },
      {
        id: "modest",
        label: "Offer matching EU grants only",
        effects: { gdpDelta: 400, unemploymentDelta: -0.02 },
      },
      {
        id: "pass",
        label: "Decline; defend French tax base",
        effects: { approval: -1 },
      },
    ],
  },
  {
    id: "minor-eu-fine",
    category: "diplomacy",
    weight: 2,
    title: "EU Commission fines France over deficit",
    description:
      "Brussels formally censures France for breaching the Stability Pact. Markets react cautiously.",
    choices: [
      {
        id: "pay",
        label: "Pay the €600M fine and comply",
        effects: { treasury: -600, approval: -1 },
      },
      {
        id: "contest",
        label: "Contest in the ECJ",
        effects: { approval: 1, debtDelta: 0.1 },
      },
    ],
  },
  {
    id: "minor-cyber-attack",
    category: "crisis",
    weight: 2,
    title: "Cyberattack on hospital network",
    description:
      "Ransomware paralyses two CHU hospitals. Patients diverted; opposition demands cybersecurity overhaul.",
    choices: [
      {
        id: "invest",
        label: "Launch €1.2B national cyber plan",
        effects: { treasury: -1200, approval: 3 },
      },
      {
        id: "pay-ransom",
        label: "Authorise the ransom payment quietly",
        effects: { treasury: -50, approval: -4 },
      },
      {
        id: "minimise",
        label: "Wait it out, downplay publicly",
        effects: { approval: -3 },
      },
    ],
  },
  {
    id: "minor-media-tour",
    category: "opportunity",
    weight: 1,
    title: "Prime-time interview opportunity",
    description:
      "TF1 offers a one-hour solo prime-time slot. The risk: a hostile journalist; the reward: direct audience.",
    choices: [
      {
        id: "accept",
        label: "Accept and prepare thoroughly",
        effects: { approval: 3 },
      },
      {
        id: "decline",
        label: "Decline; delegate to the PM",
        effects: { approval: -1 },
      },
    ],
  },
  {
    id: "minor-suburb-riot",
    category: "crisis",
    weight: 2,
    title: "Unrest in a Paris suburb",
    description:
      "A police operation in Seine-Saint-Denis sparks two nights of unrest. Vehicles burned, shops looted.",
    choices: [
      {
        id: "deploy",
        label: "Deploy CRS and impose curfew",
        effects: { approval: 1, treasury: -200 },
      },
      {
        id: "social",
        label: "Announce €500M neighbourhood plan",
        effects: { treasury: -500, approval: 2 },
      },
      {
        id: "passive",
        label: "Let local prefects handle it",
        effects: { approval: -3 },
      },
    ],
  },
]

const TEMPLATES_BY_NATION: Record<NationCode, ProceduralTemplate[]> = {
  FR: FR_TEMPLATES,
}

export interface ProceduralEventInput {
  nation: NationCode
  date: Date
  triggeredIds: ReadonlySet<string>
  cooldownDays?: number
  baseChancePerDay?: number
}

export function maybeGenerateProceduralEvent(
  input: ProceduralEventInput
): EventDefinition | null {
  const templates = TEMPLATES_BY_NATION[input.nation] ?? []
  if (templates.length === 0) return null
  const baseChance = input.baseChancePerDay ?? 0.03
  if (getClock().random() > baseChance) return null

  const available = templates.filter(
    (t) => !alreadyTriggered(t.id, input.triggeredIds)
  )
  if (available.length === 0) return null

  const totalWeight = available.reduce((s, t) => s + t.weight, 0)
  let roll = getClock().random() * totalWeight
  let picked = available[0]!
  for (const t of available) {
    roll -= t.weight
    if (roll <= 0) {
      picked = t
      break
    }
  }

  const iso = input.date.toISOString().slice(0, 10)
  const uniqueId = `${picked.id}-${iso}-${shortId()}`
  return {
    id: uniqueId,
    nation: input.nation,
    category: picked.category,
    date: iso,
    title: picked.title,
    description: picked.description,
    choices: picked.choices.map((c) => ({ ...c, effects: { ...c.effects } })),
  }
}

function alreadyTriggered(
  templateId: string,
  triggered: ReadonlySet<string>
): boolean {
  for (const id of triggered) {
    if (id.startsWith(`${templateId}-`)) return true
  }
  return false
}

function shortId(): string {
  return getClock().random().toString(36).slice(2, 6)
}
