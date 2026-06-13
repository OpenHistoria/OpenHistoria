import { Result, TaggedError } from "better-result"
import { z } from "zod"

import {
  DEFAULT_MODEL,
  requestCompletion,
  type CompletionError,
  type CompletionMessage,
} from "@workspace/engine/openrouter"
import { buildSystemPrompt, buildTurnPrompt } from "@workspace/engine/prompts"
import type { GameStore, GameStoreError } from "@workspace/engine/store"
import {
  addMonths,
  clampDay,
  compareGameDates,
  toTimeline,
  TurnOutputSchema,
  type ChatMessage,
  type Game,
  type GameDate,
  type GameEvent,
  type ScheduledEvent,
  type TurnResult,
} from "@workspace/engine/types"

/** No game with that id in the store. */
export class GameNotFoundError extends TaggedError("GameNotFound")<{
  gameId: string
}>() {}

/** The game clock already reached its end year. */
export class GameCompletedError extends TaggedError("GameCompleted")<{
  gameId: string
}>() {}

/** No OpenRouter key available; the player must connect first. */
export class MissingApiKeyError extends TaggedError("MissingApiKey")() {}

/** startYear must fall within [minYear, maxYear]. */
export class InvalidStartYearError extends TaggedError("InvalidStartYear")<{
  startYear: number
}>() {}

/** The model replied, but not with valid turn JSON. */
export class InvalidTurnOutputError extends TaggedError("InvalidTurnOutput")<{
  raw: string
}>() {}

/** A save file did not match the expected snapshot shape. */
export class InvalidSnapshotError extends TaggedError("InvalidSnapshot")() {}

export const SNAPSHOT_VERSION = 1 as const

/** A self-contained, portable save: a game plus everything attached to it. */
export interface GameSnapshot {
  version: typeof SNAPSHOT_VERSION
  game: Game
  messages: ChatMessage[]
  events: GameEvent[]
  scheduled: ScheduledEvent[]
}

const isSnapshot = (value: unknown): value is GameSnapshot => {
  if (typeof value !== "object" || value === null) return false
  const s = value as Record<string, unknown>
  const game = s.game as Record<string, unknown> | undefined
  return (
    s.version === SNAPSHOT_VERSION &&
    typeof game === "object" &&
    game !== null &&
    typeof game.countryCode === "string" &&
    typeof game.startYear === "number" &&
    Array.isArray(s.messages) &&
    Array.isArray(s.events) &&
    Array.isArray(s.scheduled)
  )
}

export type AdvanceTimeError =
  | GameNotFoundError
  | GameCompletedError
  | MissingApiKeyError
  | InvalidTurnOutputError
  | CompletionError
  | GameStoreError

export interface EngineConfig {
  store: GameStore
  /** Returns the player's OpenRouter key, or null when disconnected. */
  getApiKey: () => string | null
  /** OpenRouter model id used for new games. */
  model?: string
  /** Latest year a game may START in; defaults to the current real-world year. */
  maxYear?: number
  /** Earliest pickable start year. */
  minYear?: number
  /** How many history messages to send to the model each turn. */
  historyWindow?: number
  /** Cap on completion tokens per turn (defaults to DEFAULT_MAX_OUTPUT_TOKENS). */
  maxOutputTokens?: number
}

/**
 * How much in-game time one turn covers, in months. One month keeps each AI
 * call to a short, granular span (with day-precise events) instead of
 * generating a whole year at once.
 */
export const MONTHS_PER_TURN = 1

/**
 * Default per-turn completion cap. A turn's JSON (narration + events +
 * scheduled events) fits comfortably here, and bounding it keeps OpenRouter
 * from reserving a model's full max output against the player's balance, which
 * otherwise 402s small/free-tier accounts before a turn even runs.
 */
export const DEFAULT_MAX_OUTPUT_TOKENS = 8192

export interface CreateGameInput {
  countryCode: string
  countryName: string
  startYear: number
  /** Override the engine-level model for this game. */
  model?: string
  /** Language (English name) for generated content; defaults to English. */
  language?: string
}

/** Fallback content language when a game does not specify one. */
export const DEFAULT_LANGUAGE = "English"

/**
 * Sentinel model id meaning "rotate between the best free models each turn".
 * Stored on the game; the client resolves it to a concrete model per turn via
 * AdvanceTimeOptions.modelOverride.
 */
export const ROTATE_FREE_MODELS = "auto:rotate-free"

export interface AdvanceTimeOptions {
  /** How far the clock jumps this turn. Defaults to MONTHS_PER_TURN. */
  months?: number
  /** Player directives for the period, in natural language. */
  playerAction?: string
  /** Fallback models OpenRouter routes to if the game's model errors/limits. */
  fallbackModels?: string[]
  /**
   * Concrete model to use for this turn instead of the game's stored model.
   * Used to resolve the ROTATE_FREE_MODELS sentinel to a real model per turn.
   */
  modelOverride?: string
}

const newId = () => crypto.randomUUID()

/**
 * Orchestrates games: creates them, advances their clock, and keeps every
 * message, event, and scheduled event persisted through the GameStore.
 * Stateless besides its config, so a single instance can drive many games.
 */
export class Engine {
  private readonly store: GameStore
  private readonly getApiKey: () => string | null
  private readonly model: string
  /** Latest year a game may start in. */
  readonly maxYear: number
  /** Earliest pickable start year. */
  readonly minYear: number
  private readonly historyWindow: number
  private readonly maxOutputTokens: number

  constructor(config: EngineConfig) {
    this.store = config.store
    this.getApiKey = config.getApiKey
    this.model = config.model ?? DEFAULT_MODEL
    this.maxYear = config.maxYear ?? new Date().getFullYear()
    this.minYear = config.minYear ?? 1800
    this.historyWindow = config.historyWindow ?? 16
    this.maxOutputTokens = config.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS
  }

  /**
   * Creates a game starting in January of startYear and records its system
   * prompt as the first message, so the full conversation is reconstructable
   * from the store alone.
   */
  async createGame(
    input: CreateGameInput
  ): Promise<Result<Game, InvalidStartYearError | GameStoreError>> {
    if (
      !Number.isInteger(input.startYear) ||
      input.startYear < this.minYear ||
      input.startYear > this.maxYear
    ) {
      return Result.err(
        new InvalidStartYearError({ startYear: input.startYear })
      )
    }

    const now = Date.now()
    // Begin at today's month and day (in the chosen start year), so a game
    // started "now" opens on the real current date rather than January 1st.
    const today = new Date(now)
    const game: Game = {
      id: newId(),
      countryCode: input.countryCode.toUpperCase(),
      countryName: input.countryName,
      startYear: input.startYear,
      currentDate: {
        year: input.startYear,
        month: today.getMonth() + 1,
        day: today.getDate(),
      },
      status: "active",
      model: input.model ?? this.model,
      language: input.language ?? DEFAULT_LANGUAGE,
      createdAt: now,
      updatedAt: now,
    }

    const saved = await this.store.saveGame(game)
    if (saved.isErr()) return Result.err(saved.error)

    const recorded = await this.store.appendMessages(game.id, [
      {
        id: newId(),
        gameId: game.id,
        role: "system",
        content: buildSystemPrompt(game),
        gameDate: game.currentDate,
        createdAt: now,
      },
    ])
    if (recorded.isErr()) return Result.err(recorded.error)

    return Result.ok(game)
  }

  async listGames(): Promise<Result<Game[], GameStoreError>> {
    return this.store.listGames()
  }

  async getGame(
    gameId: string
  ): Promise<Result<Game, GameNotFoundError | GameStoreError>> {
    const game = await this.store.getGame(gameId)
    if (game.isErr()) return Result.err(game.error)
    if (game.value === null) {
      return Result.err(new GameNotFoundError({ gameId }))
    }
    return Result.ok(game.value)
  }

  async deleteGame(gameId: string): Promise<Result<void, GameStoreError>> {
    return this.store.deleteGame(gameId)
  }

  /** Switches the OpenRouter model an existing game uses for future turns. */
  async setGameModel(
    gameId: string,
    model: string
  ): Promise<Result<Game, GameNotFoundError | GameStoreError>> {
    const loaded = await this.getGame(gameId)
    if (loaded.isErr()) return Result.err(loaded.error)
    const updated: Game = { ...loaded.value, model, updatedAt: Date.now() }
    const saved = await this.store.saveGame(updated)
    if (saved.isErr()) return Result.err(saved.error)
    return Result.ok(updated)
  }

  /** Full conversation log, oldest first. */
  async getMessages(
    gameId: string
  ): Promise<Result<ChatMessage[], GameStoreError>> {
    return this.store.listMessages(gameId)
  }

  /** All events so far, chronologically: the game's timeline. */
  async getTimeline(
    gameId: string
  ): Promise<Result<GameEvent[], GameStoreError>> {
    const events = await this.store.listEvents(gameId)
    return events.map(toTimeline)
  }

  /** Pending scheduled events, soonest first. */
  async getScheduled(
    gameId: string
  ): Promise<Result<ScheduledEvent[], GameStoreError>> {
    const scheduled = await this.store.listScheduled(gameId)
    return scheduled.map((list) =>
      [...list].sort((a, b) => compareGameDates(a.dueDate, b.dueDate))
    )
  }

  /**
   * Runs one turn: advances the clock by `months` (clamped to the game's end
   * year), hands the model the period, any scheduled events that came due,
   * and the player's directives, then persists the narration, events, and
   * newly scheduled events it returns.
   */
  async advanceTime(
    gameId: string,
    options: AdvanceTimeOptions = {}
  ): Promise<Result<TurnResult, AdvanceTimeError>> {
    const loaded = await this.getGame(gameId)
    if (loaded.isErr()) return Result.err(loaded.error)
    const game = loaded.value

    if (game.status === "completed") {
      return Result.err(new GameCompletedError({ gameId }))
    }

    const apiKey = this.getApiKey()
    if (!apiKey) {
      return Result.err(new MissingApiKeyError())
    }

    // Games are open-ended: time just keeps moving forward, no end year.
    const months = Math.max(1, Math.floor(options.months ?? MONTHS_PER_TURN))
    const target = addMonths(game.currentDate, months)

    const scheduled = await this.store.listScheduled(gameId)
    if (scheduled.isErr()) return Result.err(scheduled.error)
    const due = scheduled.value.filter(
      (event) => compareGameDates(event.dueDate, target) <= 0
    )
    const stillPending = scheduled.value.filter(
      (event) => compareGameDates(event.dueDate, target) > 0
    )

    const history = await this.store.listMessages(gameId)
    if (history.isErr()) return Result.err(history.error)

    const turnPrompt = buildTurnPrompt({
      game,
      target,
      due,
      playerAction: options.playerAction,
    })
    const completion = await requestCompletion({
      apiKey,
      model: options.modelOverride ?? game.model,
      fallbackModels: options.fallbackModels,
      maxTokens: this.maxOutputTokens,
      messages: [
        ...this.windowedHistory(history.value, game),
        { role: "user", content: turnPrompt },
      ],
      schema: {
        name: "turn",
        schema: z.toJSONSchema(TurnOutputSchema) as Record<string, unknown>,
      },
    })
    if (completion.isErr()) return Result.err(completion.error)

    const parsed = Result.try({
      try: () => TurnOutputSchema.parse(JSON.parse(completion.value)),
      catch: () => new InvalidTurnOutputError({ raw: completion.value }),
    })
    if (parsed.isErr()) return Result.err(parsed.error)
    const turn = parsed.value

    const now = Date.now()
    const dueIds = new Set(due.map((event) => event.id))
    const events: GameEvent[] = turn.events.map((event) => {
      const date = this.clampDate(
        clampDay({ year: event.year, month: event.month, day: event.day }),
        game.currentDate,
        target
      )
      // Keep an end date only when it is a valid, later date.
      let endDate: GameDate | null = null
      if (event.end) {
        const end = clampDay(event.end)
        if (compareGameDates(end, date) > 0) endDate = end
      }
      return {
        id: newId(),
        gameId,
        date,
        endDate,
        title: event.title,
        description: event.description,
        kind: event.kind,
        countries: event.countries.map((code) => code.toUpperCase()),
        location: event.location,
        importance: event.importance,
        source:
          dueIds.size > 0 && due.some((d) => d.title === event.title)
            ? "scheduled"
            : "model",
      }
    })

    const newlyScheduled: ScheduledEvent[] = turn.scheduledEvents
      .map((event) => ({
        id: newId(),
        gameId,
        dueDate: clampDay({
          year: event.year,
          month: event.month,
          day: event.day,
        }),
        title: event.title,
        description: event.description,
        scheduledAt: target,
      }))
      // Drop anything the model misdated into the past.
      .filter((event) => compareGameDates(event.dueDate, target) > 0)

    const updatedGame: Game = {
      ...game,
      currentDate: target,
      updatedAt: now,
    }

    // Persist the turn. Order matters: messages first so the conversation
    // is never missing a turn that produced visible events.
    const writes: Array<Result<void, GameStoreError>> = [
      await this.store.appendMessages(gameId, [
        {
          id: newId(),
          gameId,
          role: "user",
          content: turnPrompt,
          gameDate: target,
          createdAt: now,
        },
        {
          id: newId(),
          gameId,
          role: "assistant",
          content: completion.value,
          gameDate: target,
          createdAt: now,
        },
      ]),
      await this.store.appendEvents(gameId, events),
      await this.store.putScheduled(gameId, [
        ...stillPending,
        ...newlyScheduled,
      ]),
      await this.store.saveGame(updatedGame),
    ]
    for (const write of writes) {
      if (write.isErr()) return Result.err(write.error)
    }

    return Result.ok({
      game: updatedGame,
      narration: turn.narration,
      events,
      scheduled: newlyScheduled,
      decision: turn.decision
        ? {
            title: turn.decision.title,
            prompt: turn.decision.prompt,
            options: turn.decision.options.map((o) => ({
              label: o.label,
              detail: o.detail,
            })),
          }
        : null,
    })
  }

  /**
   * System prompt plus the most recent turns, so long games do not grow the
   * request without bound. Older context survives implicitly: each narration
   * summarizes its period and the model is asked to stay consistent.
   */
  private windowedHistory(
    history: ChatMessage[],
    game: Game
  ): CompletionMessage[] {
    const system = history.find((message) => message.role === "system")
    const rest = history.filter((message) => message.role !== "system")
    const recent = rest.slice(-this.historyWindow)
    return [
      {
        role: "system" as const,
        content: system?.content ?? buildSystemPrompt(game),
      },
      ...recent.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ]
  }

  private clampDate(date: GameDate, from: GameDate, to: GameDate): GameDate {
    if (compareGameDates(date, from) < 0) return from
    if (compareGameDates(date, to) > 0) return to
    return date
  }

  /** Gathers a game and all its attached data into a portable snapshot. */
  async exportGame(
    gameId: string
  ): Promise<Result<GameSnapshot, GameNotFoundError | GameStoreError>> {
    const game = await this.getGame(gameId)
    if (game.isErr()) return Result.err(game.error)

    const [messages, events, scheduled] = await Promise.all([
      this.store.listMessages(gameId),
      this.store.listEvents(gameId),
      this.store.listScheduled(gameId),
    ])
    if (messages.isErr()) return Result.err(messages.error)
    if (events.isErr()) return Result.err(events.error)
    if (scheduled.isErr()) return Result.err(scheduled.error)

    return Result.ok({
      version: SNAPSHOT_VERSION,
      game: game.value,
      messages: messages.value,
      events: events.value,
      scheduled: scheduled.value,
    })
  }

  /**
   * Restores a snapshot as a brand-new game: a fresh id is minted and every
   * attached record is re-pointed at it, so importing never clobbers an
   * existing game and the same file can be imported more than once.
   */
  async importGame(
    snapshot: unknown
  ): Promise<Result<Game, InvalidSnapshotError | GameStoreError>> {
    if (!isSnapshot(snapshot)) return Result.err(new InvalidSnapshotError())

    const now = Date.now()
    const id = newId()
    const game: Game = { ...snapshot.game, id, updatedAt: now }
    const reId = <T extends { gameId: string }>(record: T): T => ({
      ...record,
      gameId: id,
    })

    const saved = await this.store.saveGame(game)
    if (saved.isErr()) return Result.err(saved.error)
    const messages = await this.store.appendMessages(
      id,
      snapshot.messages.map(reId)
    )
    if (messages.isErr()) return Result.err(messages.error)
    const events = await this.store.appendEvents(id, snapshot.events.map(reId))
    if (events.isErr()) return Result.err(events.error)
    const scheduled = await this.store.putScheduled(
      id,
      snapshot.scheduled.map(reId)
    )
    if (scheduled.isErr()) return Result.err(scheduled.error)

    return Result.ok(game)
  }
}
