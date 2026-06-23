import { z } from "zod"

/**
 * Core domain model for the Open Case engine.
 *
 * A Case is an AI-driven detective mystery. The player picks a setting and an
 * optional hook, names their detective, and the model invents a full crime: a
 * victim, a cast of suspects (each with an alibi and a secret), and a hidden
 * solution - who did it, why, and how. The player then works the case one
 * Round at a time: examining the scene, interrogating suspects, and chasing
 * leads. Each move the player makes is answered by a fresh Round the model
 * generates in reaction, surfacing clues that stay consistent with the hidden
 * truth. When the player is ready they name a culprit; the model stages the
 * confrontation and the case is closed - solved or blown.
 */

/** The setting templates a player can open a case in. */
export const SETTINGS = [
  "manor",
  "noir",
  "victorian",
  "express",
  "academia",
  "island",
  "cyberpunk",
  "occult",
] as const

export type Setting = (typeof SETTINGS)[number]

export const SETTING_LABELS: Record<Setting, string> = {
  manor: "Country Manor",
  noir: "Noir City",
  victorian: "Victorian London",
  express: "Luxury Express",
  academia: "Old University",
  island: "Remote Island",
  cyberpunk: "Neon Megacity",
  occult: "Occult Mystery",
}

/** How hard the mystery should be to crack. */
export const DIFFICULTIES = ["rookie", "detective", "mastermind"] as const

export type Difficulty = (typeof DIFFICULTIES)[number]

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  rookie: "Rookie",
  detective: "Detective",
  mastermind: "Mastermind",
}

export type CaseStatus = "active" | "solved" | "failed"

/**
 * The player's detective: the persona the investigation is told around. Steers
 * the model's voice and what the detective notices. Fields may be blank; the
 * model improvises around whatever is missing.
 */
export interface Detective {
  /** The detective's name. */
  name: string
  /** How the detective is referred to, e.g. "she/her", "they/them". */
  pronouns: string
  /** Rank, role, or reputation, e.g. "Scotland Yard inspector", "private eye". */
  role: string
  /** Investigative style and temperament, e.g. "methodical and cold". */
  style: string
  /** Backstory and where they stand as the case opens. */
  background: string
}

export const EMPTY_DETECTIVE: Detective = {
  name: "",
  pronouns: "",
  role: "",
  style: "",
  background: "",
}

/** Whether a detective has enough to start (just a name is enough). */
export const isPlayableDetective = (detective: Detective): boolean =>
  detective.name.trim().length > 0

/**
 * One person of interest in the case. The alibi is what they tell the
 * detective; the secret is the private truth the model knows and reveals only
 * through investigation. Secrets are often unrelated red herrings - only the
 * culprit's secret is the crime itself.
 */
export interface Suspect {
  /** The suspect's name. */
  name: string
  /** Their relationship to the victim or role in the setting. */
  role: string
  /** A short physical / character sketch. */
  description: string
  /** What they claim they were doing; may be a lie. */
  alibi: string
  /** The private truth they are hiding. Never shown to the player directly. */
  secret: string
}

/**
 * The hidden truth of the case. Generated with the case and kept out of the
 * player-facing UI; it lives in the model's context so every clue stays
 * consistent, and it is the answer the player's accusation is judged against.
 */
export interface Solution {
  /** The guilty party. Always matches one suspect's name. */
  culprit: string
  /** Why they did it. */
  motive: string
  /** How they did it. */
  method: string
  /** The clues that, taken together, point to the culprit. */
  keyEvidence: string[]
}

export interface Case {
  id: string
  /** Player-facing case title, e.g. "The Body in the Boathouse". */
  title: string
  setting: Setting
  difficulty: Difficulty
  /** One-line hook the player wrote, steering tone and premise. */
  premise: string
  /** The detective the investigation is told around. */
  detective: Detective
  /** The victim: name and a one-line description. */
  victim: string
  /** The public facts the detective knows on arrival. */
  crimeSummary: string
  /** The full cast of suspects. */
  suspects: Suspect[]
  /** The hidden truth. Never surfaced to the player until the accusation. */
  solution: Solution
  status: CaseStatus
  /** OpenRouter model id this case is played with. */
  model: string
  /** Human language the model writes in (English language name). */
  language: string
  createdAt: number
  updatedAt: number
}

export type ChatRole = "system" | "user" | "assistant"

/** One entry in the case's conversation log with the model. */
export interface ChatMessage {
  id: string
  caseId: string
  role: ChatRole
  content: string
  createdAt: number
}

/**
 * The investigation's living state, fully re-stated by the model each round
 * (a snapshot, not a delta), so the latest round always reflects everything
 * uncovered so far.
 */
export interface CaseState {
  /** Where the detective currently is. */
  location: string
  /** Clues and evidence gathered so far. */
  clues: string[]
  /** Open threads worth chasing next. */
  leads: string[]
  /** Names of suspects the detective has confidently ruled out. */
  cleared: string[]
}

export const EMPTY_STATE: CaseState = {
  location: "",
  clues: [],
  leads: [],
  cleared: [],
}

/** One investigative action the player can take out of a round. */
export interface Choice {
  /** Short action label, e.g. "Press the butler on his alibi". */
  label: string
  /** One-line tease of what taking it might turn up. */
  hint: string
}

/** How a case was closed. */
export type CaseOutcome = "solved" | "failed"

/**
 * One beat of the investigation: the prose, the case state after it, and the
 * actions leading onward. Rounds are ordered by `index`, oldest first. A
 * round with a non-null `outcome` is the terminal confrontation that closed
 * the case.
 */
export interface Round {
  id: string
  caseId: string
  /** 0-based position in the investigation; 0 is the opening round. */
  index: number
  /** The action the player took to reach this round; null for the opening. */
  chosenAction: string | null
  /** The narrated prose for this beat. */
  narration: string
  /** Onward investigative actions; empty when this round closed the case. */
  choices: Choice[]
  /** The investigation state as of this round. */
  state: CaseState
  /** Set only on the terminal confrontation round. */
  outcome: CaseOutcome | null
  createdAt: number
}

/** Rounds sorted oldest-first: the investigation so far. */
export const toInvestigation = (rounds: Round[]): Round[] =>
  [...rounds].sort((a, b) => a.index - b.index)

/**
 * Zod schemas for what the model must return. Sent to OpenRouter as strict
 * JSON schemas (structured outputs), so fields that may be absent are nullable
 * rather than optional.
 */

export const SuspectSchema = z.strictObject({
  name: z.string(),
  role: z.string(),
  description: z.string(),
  alibi: z.string(),
  secret: z.string(),
})

export const SolutionSchema = z.strictObject({
  culprit: z.string(),
  motive: z.string(),
  method: z.string(),
  keyEvidence: z.array(z.string()),
})

/**
 * The full dossier the model invents for a new case: the public crime plus the
 * hidden solution. The culprit must be one of the suspects by name.
 */
export const CaseFileSchema = z.strictObject({
  title: z.string(),
  victim: z.string(),
  crimeSummary: z.string(),
  suspects: z.array(SuspectSchema).min(3).max(6),
  solution: SolutionSchema,
})

export type CaseFileOutput = z.infer<typeof CaseFileSchema>

export const RoundStateSchema = z.strictObject({
  location: z.string(),
  clues: z.array(z.string()),
  leads: z.array(z.string()),
  cleared: z.array(z.string()),
})

export const RoundChoiceSchema = z.strictObject({
  label: z.string(),
  hint: z.string(),
})

export const RoundOutputSchema = z.strictObject({
  /** The investigation prose for this beat, addressed to the player (you/your). */
  narration: z.string(),
  /** 2-5 distinct onward actions the detective could take next. */
  choices: z.array(RoundChoiceSchema).max(5),
  /** The investigation's full state after this beat. */
  state: RoundStateSchema,
})

export type RoundOutput = z.infer<typeof RoundOutputSchema>

/** What Engine.advance returns after a successful round. */
export interface AdvanceResult {
  case: Case
  round: Round
}

/** What Engine.accuse returns after the confrontation. */
export interface AccusationResult {
  case: Case
  round: Round
  outcome: CaseOutcome
}
