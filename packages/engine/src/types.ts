import { z } from "zod"

/**
 * Core domain model for the Open Historia game engine.
 *
 * A Game is an alternate-history playthrough: the player picks a base
 * country and a start year, then advances time in month-sized steps. Each
 * advance is one "turn": the model narrates the elapsed period, emits
 * concrete events (placed on the map via coordinates), and schedules future
 * events that are handed back to it when their date comes due.
 */

/** In-game calendar position. Month is 1-12, day is 1-31. */
export interface GameDate {
  year: number
  month: number
  day: number
}

export const compareGameDates = (a: GameDate, b: GameDate): number =>
  a.year - b.year || a.month - b.month || a.day - b.day

/** Number of days in a given 1-based month, leap years included. */
export const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

/** Clamps a day to a valid value for its month (e.g. Feb 30 becomes Feb 28/29). */
export const clampDay = (date: GameDate): GameDate => ({
  ...date,
  day: Math.min(Math.max(1, date.day), daysInMonth(date.year, date.month)),
})

export const addMonths = (date: GameDate, months: number): GameDate => {
  const total = date.year * 12 + (date.month - 1) + months
  const year = Math.floor(total / 12)
  const month = (total % 12) + 1
  // Keep the day of month, pulling it back when the target month is shorter.
  return { year, month, day: Math.min(date.day, daysInMonth(year, month)) }
}

/** Adds (or subtracts) whole days, rolling months and years over correctly. */
export const addDays = (date: GameDate, days: number): GameDate => {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  }
}

export const minGameDate = (a: GameDate, b: GameDate): GameDate =>
  compareGameDates(a, b) <= 0 ? a : b

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

export const formatGameDate = (date: GameDate): string =>
  `${MONTH_NAMES[date.month - 1]} ${date.day}, ${date.year}`

export type GameStatus = "active" | "completed"

export interface Game {
  id: string
  /** ISO 3166-1 alpha-2 code of the player's base country. */
  countryCode: string
  countryName: string
  startYear: number
  currentDate: GameDate
  status: GameStatus
  /** OpenRouter model id this game is played with. */
  model: string
  /**
   * Human language the model writes narration and events in, as an English
   * language name (e.g. "English", "French"). Set from the UI locale at
   * creation so generated content matches what the player reads.
   */
  language: string
  /** Real-world timestamps (ms since epoch). */
  createdAt: number
  updatedAt: number
}

export type ChatRole = "system" | "user" | "assistant"

/**
 * One entry in the game's conversation log. Every prompt sent to the model
 * and every reply it gives is recorded here, so a game can be resumed,
 * replayed, or audited at any point.
 */
export interface ChatMessage {
  id: string
  gameId: string
  role: ChatRole
  content: string
  /** In-game date the message refers to (the turn's target date). */
  gameDate: GameDate
  createdAt: number
}

export const EVENT_KINDS = [
  "political",
  "military",
  "economic",
  "diplomatic",
  "social",
  "scientific",
  "disaster",
] as const

export type EventKind = (typeof EVENT_KINDS)[number]

export interface EventLocation {
  lat: number
  lng: number
  /** Human-readable place name, e.g. "Paris" or "Strait of Hormuz". */
  label: string
}

/** Something that happened in the game world, plottable on the map. */
export interface GameEvent {
  id: string
  gameId: string
  date: GameDate
  /**
   * For events that span time (wars, construction, crises), the date it ends.
   * Null for instantaneous events.
   */
  endDate: GameDate | null
  title: string
  description: string
  kind: EventKind
  /** ISO 3166-1 alpha-2 codes of the countries involved. */
  countries: string[]
  /** Where to place the event marker, when it has a meaningful location. */
  location: EventLocation | null
  /** 1 (local footnote) to 5 (world-changing). */
  importance: number
  /** Whether the event came from the model, a due scheduled event, or the player. */
  source: "model" | "scheduled" | "player"
}

/**
 * A future event the model has committed to. When the game clock reaches
 * dueDate the engine hands it back to the model, which resolves it into one
 * or more concrete GameEvents (or narrates why it fizzled).
 */
export interface ScheduledEvent {
  id: string
  gameId: string
  dueDate: GameDate
  title: string
  description: string
  /** In-game date at which the model scheduled it. */
  scheduledAt: GameDate
}

/** One choice the player can make in response to a decision. */
export interface DecisionOption {
  /** Short button label, e.g. "Mobilize the reserves". */
  label: string
  /** One-line consequence/summary shown under the label. */
  detail: string
}

/**
 * A Crusader-Kings-style choice the simulation surfaces when the player's
 * nation faces a real fork. The game pauses and asks; the chosen option
 * becomes the player's directive for the next period.
 */
export interface GameDecision {
  title: string
  /** The situation, addressed to the player. */
  prompt: string
  options: DecisionOption[]
}

/** Events sorted chronologically: the game's timeline. */
export const toTimeline = (events: GameEvent[]): GameEvent[] =>
  [...events].sort(
    (a, b) => compareGameDates(a.date, b.date) || b.importance - a.importance
  )

/**
 * Zod schemas for what the model must return each turn. Sent to OpenRouter
 * as a strict JSON schema (structured outputs), so fields that may be absent
 * are nullable rather than optional.
 */
export const ModelEventSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  kind: z.enum(EVENT_KINDS),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  /** End date for events that span time; null for instantaneous ones. */
  end: z
    .strictObject({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
      day: z.number().int().min(1).max(31),
    })
    .nullable(),
  countries: z.array(z.string()),
  location: z
    .strictObject({ lat: z.number(), lng: z.number(), label: z.string() })
    .nullable(),
  importance: z.number().int().min(1).max(5),
})

export const ModelScheduledEventSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
})

export const ModelDecisionSchema = z.strictObject({
  title: z.string(),
  prompt: z.string(),
  options: z
    .array(z.strictObject({ label: z.string(), detail: z.string() }))
    .min(2)
    .max(4),
})

export const TurnOutputSchema = z.strictObject({
  /** Narrative summary of the elapsed period, addressed to the player. */
  narration: z.string(),
  events: z.array(ModelEventSchema),
  /** Future events to queue; resolved when the clock reaches them. */
  scheduledEvents: z.array(ModelScheduledEventSchema),
  /**
   * The calendar day the period advanced to. Only meaningful on an open-ended
   * "jump to the next major development" turn, where the model decides how far
   * to advance; on a fixed-span jump the engine sets the date and ignores this.
   * Null when the model did not pick one.
   */
  advancedTo: z
    .strictObject({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
      day: z.number().int().min(1).max(31),
    })
    .nullable(),
  /**
   * A choice for the player when the nation faces a real fork this period;
   * null when nothing needs deciding. Raising one pauses the game.
   */
  decision: ModelDecisionSchema.nullable(),
})

export type TurnOutput = z.infer<typeof TurnOutputSchema>

/**
 * What the conseiller (the player's strategic advisor) returns: prose advice
 * plus optional ready-to-issue directives the player can add to their action
 * queue with one click.
 */
export const AdvisorOutputSchema = z.strictObject({
  /** The advisor's answer, addressed to the player, in the game's language. */
  reply: z.string(),
  /**
   * Zero to three concrete directives, each phrased as an order the player
   * could issue verbatim (imperative, specific). Empty when the player only
   * asked for analysis.
   */
  suggestedActions: z.array(z.string()),
})

export type AdvisorOutput = z.infer<typeof AdvisorOutputSchema>

/** What Engine.advanceTime returns after a successful turn. */
export interface TurnResult {
  game: Game
  narration: string
  events: GameEvent[]
  scheduled: ScheduledEvent[]
  /** A choice the player must make, or null when none was raised. */
  decision: GameDecision | null
}
