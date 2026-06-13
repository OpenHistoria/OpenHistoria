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

/** In-game calendar position. Month is 1-12. */
export interface GameDate {
  year: number
  month: number
}

export const compareGameDates = (a: GameDate, b: GameDate): number =>
  a.year - b.year || a.month - b.month

export const addMonths = (date: GameDate, months: number): GameDate => {
  const total = date.year * 12 + (date.month - 1) + months
  return { year: Math.floor(total / 12), month: (total % 12) + 1 }
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
  `${MONTH_NAMES[date.month - 1]} ${date.year}`

export type GameStatus = "active" | "completed"

export interface Game {
  id: string
  /** ISO 3166-1 alpha-2 code of the player's base country. */
  countryCode: string
  countryName: string
  startYear: number
  /** The game cannot advance past December of this year. */
  endYear: number
  currentDate: GameDate
  status: GameStatus
  /** OpenRouter model id this game is played with. */
  model: string
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
})

export const TurnOutputSchema = z.strictObject({
  /** Narrative summary of the elapsed period, addressed to the player. */
  narration: z.string(),
  events: z.array(ModelEventSchema),
  /** Future events to queue; resolved when the clock reaches them. */
  scheduledEvents: z.array(ModelScheduledEventSchema),
})

export type TurnOutput = z.infer<typeof TurnOutputSchema>

/** What Engine.advanceTime returns after a successful turn. */
export interface TurnResult {
  game: Game
  narration: string
  events: GameEvent[]
  scheduled: ScheduledEvent[]
}
