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
  compareGameDates,
  minGameDate,
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

/** startYear must fall within [minYear, endYear]. */
export class InvalidStartYearError extends TaggedError("InvalidStartYear")<{
  startYear: number
}>() {}

/** The model replied, but not with valid turn JSON. */
export class InvalidTurnOutputError extends TaggedError("InvalidTurnOutput")<{
  raw: string
}>() {}

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
  /** Latest playable year; defaults to the current real-world year. */
  maxYear?: number
  /** Earliest pickable start year. */
  minYear?: number
  /** How many history messages to send to the model each turn. */
  historyWindow?: number
}

export interface CreateGameInput {
  countryCode: string
  countryName: string
  startYear: number
  /** Override the engine-level model for this game. */
  model?: string
}

export interface AdvanceTimeOptions {
  /** How far the clock jumps this turn. Defaults to 12 (one year). */
  months?: number
  /** Player directives for the period, in natural language. */
  playerAction?: string
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
  /** Latest playable year; games end in December of this year. */
  readonly maxYear: number
  /** Earliest pickable start year. */
  readonly minYear: number
  private readonly historyWindow: number

  constructor(config: EngineConfig) {
    this.store = config.store
    this.getApiKey = config.getApiKey
    this.model = config.model ?? DEFAULT_MODEL
    this.maxYear = config.maxYear ?? new Date().getFullYear()
    this.minYear = config.minYear ?? 1800
    this.historyWindow = config.historyWindow ?? 16
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
    const game: Game = {
      id: newId(),
      countryCode: input.countryCode.toUpperCase(),
      countryName: input.countryName,
      startYear: input.startYear,
      endYear: this.maxYear,
      currentDate: { year: input.startYear, month: 1 },
      status: "active",
      model: input.model ?? this.model,
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

    const months = Math.max(1, Math.floor(options.months ?? 12))
    const target = minGameDate(addMonths(game.currentDate, months), {
      year: game.endYear,
      month: 12,
    })

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
      model: game.model,
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
    const events: GameEvent[] = turn.events.map((event) => ({
      id: newId(),
      gameId,
      date: this.clampDate(
        { year: event.year, month: event.month },
        game.currentDate,
        target
      ),
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
    }))

    const newlyScheduled: ScheduledEvent[] = turn.scheduledEvents
      .map((event) => ({
        id: newId(),
        gameId,
        dueDate: { year: event.year, month: event.month },
        title: event.title,
        description: event.description,
        scheduledAt: target,
      }))
      // Drop anything the model misdated into the past or beyond the game.
      .filter(
        (event) =>
          compareGameDates(event.dueDate, target) > 0 &&
          event.dueDate.year <= game.endYear
      )

    const updatedGame: Game = {
      ...game,
      currentDate: target,
      status:
        target.year === game.endYear && target.month === 12
          ? "completed"
          : "active",
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
}
