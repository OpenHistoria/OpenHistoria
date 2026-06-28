import { z } from "zod"

/**
 * Core domain model for the Open Charm engine.
 *
 * A Flirtation is an AI-driven romance game: the player picks a setting and a
 * premise, sketches the person they're hoping to charm, and is dropped into an
 * opening Beat where they first lock eyes. Each Beat narrates a moment of the
 * encounter, tracks how it's going (attraction, mood, the chemistry you've
 * built, the missteps you've made), and offers a handful of Moves - flirty
 * lines or gestures. Picking a Move - or typing your own - advances the
 * encounter to the next Beat, which the model writes in reaction.
 *
 * The tone is warm, witty, and tasteful: charm, banter, and romantic tension,
 * never explicit content. The person you're charming is always a consenting
 * adult with a will of their own; they can be won over, but never coerced.
 */

/** The setting templates a player can start a flirtation in. */
export const SCENARIOS = [
  "cocktail-bar",
  "bookshop",
  "masquerade",
  "coffeehouse",
  "art-gallery",
  "rooftop-party",
  "night-train",
  "wedding",
] as const

export type Scenario = (typeof SCENARIOS)[number]

export const SCENARIO_LABELS: Record<Scenario, string> = {
  "cocktail-bar": "Cocktail Bar",
  bookshop: "Late-Night Bookshop",
  masquerade: "Masquerade Ball",
  coffeehouse: "Corner Coffeehouse",
  "art-gallery": "Gallery Opening",
  "rooftop-party": "Rooftop Party",
  "night-train": "Overnight Train",
  wedding: "Someone Else's Wedding",
}

export type FlirtationStatus = "active" | "ended"

/**
 * The person the player is trying to charm: a full identity the model role-
 * plays. Every field steers how they talk, what wins them over, and what falls
 * flat, so the richer it is the more grounded the encounter. Fields may be
 * blank; the model improvises around whatever is missing. Always an adult.
 */
export interface LoveInterest {
  /** Their name. */
  name: string
  /** How they're referred to, e.g. "she/her", "they/them". */
  pronouns: string
  /** Free-text age, always adult, e.g. "late 20s", "fortyish". */
  age: string
  /** A one-phrase vibe, e.g. "Aloof jazz pianist", "Sharp-tongued lawyer". */
  vibe: string
  /** Short physical description. */
  appearance: string
  /** Temperament and defining traits - what charms them, what bores them. */
  personality: string
  /** Backstory and where they stand in life as the night begins. */
  background: string
  /** What they're quietly hoping to find - or insist they're not looking for. */
  lookingFor: string
}

export const EMPTY_LOVE_INTEREST: LoveInterest = {
  name: "",
  pronouns: "",
  age: "",
  vibe: "",
  appearance: "",
  personality: "",
  background: "",
  lookingFor: "",
}

/** Whether a love interest has enough to start (just a name is enough). */
export const isPlayableInterest = (interest: LoveInterest): boolean =>
  interest.name.trim().length > 0

export interface Flirtation {
  id: string
  /** Player-facing title; derived from the love interest + scenario when blank. */
  title: string
  scenario: Scenario
  /** One-line setup the player wrote, steering tone and premise. */
  premise: string
  /** The person the player is trying to win over. */
  interest: LoveInterest
  status: FlirtationStatus
  /** OpenRouter model id this flirtation is played with. */
  model: string
  /**
   * Human language the model writes in, as an English language name (e.g.
   * "English", "French"). Set at creation so generated prose matches what the
   * player reads.
   */
  language: string
  /** Real-world timestamps (ms since epoch). */
  createdAt: number
  updatedAt: number
}

export type ChatRole = "system" | "user" | "assistant"

/**
 * One entry in the flirtation's conversation log. Every prompt sent to the
 * model and every reply it gives is recorded, so an encounter can be resumed,
 * replayed, or audited.
 */
export interface ChatMessage {
  id: string
  flirtationId: string
  role: ChatRole
  content: string
  createdAt: number
}

/**
 * How the encounter is going, fully re-stated by the model each beat (not a
 * diff), so the latest beat is always a complete snapshot.
 */
export interface MoodState {
  /** How won over they are, 0 (walking away) to 100 (smitten). */
  attraction: number
  /** Their current emotional read in a word or two, e.g. "guarded but curious". */
  mood: string
  /** Where the two of you are right now, e.g. "the bar's quiet back booth". */
  location: string
  /** Sparks that landed - shared interests, good lines, real moments. */
  chemistry: string[]
  /** Awkward beats and things that fell flat. */
  missteps: string[]
  /** A one-line read on where things stand. */
  read: string
}

export const EMPTY_STATE: MoodState = {
  attraction: 20,
  mood: "",
  location: "",
  chemistry: [],
  missteps: [],
  read: "",
}

/** One thing the player can say or do out of a beat. */
export interface Move {
  /** Short action label, e.g. "Tease them about the bad wine". */
  label: string
  /** One-line tease of how it might land. */
  hint: string
}

/** How a flirtation came to a close. */
export const ENDING_KINDS = ["smitten", "rejected", "friends", "open"] as const

export type EndingKind = (typeof ENDING_KINDS)[number]

/**
 * One beat of the encounter: the prose, how things stand after it, and the
 * moves leading onward. Beats are ordered by `index`, oldest first.
 */
export interface Beat {
  id: string
  flirtationId: string
  /** 0-based position in the encounter; 0 is the opening. */
  index: number
  /** The move the player made to reach this beat; null for the opening. */
  chosenMove: string | null
  /** The narrated prose for this beat. */
  narration: string
  /** Onward moves; empty when this beat is an ending. */
  moves: Move[]
  /** How things stand as of this beat. */
  state: MoodState
  /** True when the encounter concludes here. */
  isEnding: boolean
  /** How it ended, when it ended. */
  endingKind: EndingKind | null
  createdAt: number
}

/** Beats sorted oldest-first: the encounter so far. */
export const toEncounter = (beats: Beat[]): Beat[] =>
  [...beats].sort((a, b) => a.index - b.index)

/**
 * Zod schemas for what the model must return for each beat. Sent to OpenRouter
 * as a strict JSON schema (structured outputs), so fields that may be absent
 * are nullable rather than optional.
 */
export const BeatStateSchema = z.strictObject({
  attraction: z.number().int().min(0).max(100),
  mood: z.string(),
  location: z.string(),
  chemistry: z.array(z.string()),
  missteps: z.array(z.string()),
  read: z.string(),
})

export const BeatMoveSchema = z.strictObject({
  label: z.string(),
  hint: z.string(),
})

export const BeatOutputSchema = z.strictObject({
  /** The prose for this beat, addressed to the player in 2nd person. */
  narration: z.string(),
  /**
   * 2-4 distinct onward moves. Empty only when `isEnding` is true; the
   * encounter stops there.
   */
  moves: z.array(BeatMoveSchema).max(4),
  /** How things stand after this beat. */
  state: BeatStateSchema,
  /** True when the encounter reaches a natural conclusion this beat. */
  isEnding: z.boolean(),
  /** How it ended; null unless `isEnding` is true. */
  endingKind: z.enum(ENDING_KINDS).nullable(),
})

export type BeatOutput = z.infer<typeof BeatOutputSchema>

/**
 * What the model must return when generating a love interest. Sent to
 * OpenRouter as a strict JSON schema; every field is filled (the model invents
 * what the player left open).
 */
export const LoveInterestSchema = z.strictObject({
  name: z.string(),
  pronouns: z.string(),
  age: z.string(),
  vibe: z.string(),
  appearance: z.string(),
  personality: z.string(),
  background: z.string(),
  lookingFor: z.string(),
})

export type LoveInterestOutput = z.infer<typeof LoveInterestSchema>

/** What Engine.advance returns after a successful beat. */
export interface AdvanceResult {
  flirtation: Flirtation
  beat: Beat
}
