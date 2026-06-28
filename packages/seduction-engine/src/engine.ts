import { Result, TaggedError } from "better-result"
import { z } from "zod"

import {
  DEFAULT_MODEL,
  requestCompletion,
  type CompletionError,
  type CompletionMessage,
} from "@workspace/engine/openrouter"

import {
  buildContinuePrompt,
  buildInterestPrompt,
  buildOpeningPrompt,
  buildSystemPrompt,
} from "@workspace/seduction-engine/prompts"
import type {
  FlirtationStore,
  FlirtationStoreError,
} from "@workspace/seduction-engine/store"
import {
  BeatOutputSchema,
  EMPTY_STATE,
  LoveInterestSchema,
  toEncounter,
  type AdvanceResult,
  type Beat,
  type ChatMessage,
  type Flirtation,
  type LoveInterest,
  type MoodState,
  type Scenario,
} from "@workspace/seduction-engine/types"

/** No flirtation with that id in the store. */
export class FlirtationNotFoundError extends TaggedError("FlirtationNotFound")<{
  flirtationId: string
}>() {}

/** The encounter already reached an ending; it cannot be advanced further. */
export class FlirtationEndedError extends TaggedError("FlirtationEnded")<{
  flirtationId: string
}>() {}

/** No OpenRouter key available; the player must connect first. */
export class MissingApiKeyError extends TaggedError("MissingApiKey")() {}

/** The model replied, but not with a valid beat JSON. */
export class InvalidBeatOutputError extends TaggedError("InvalidBeatOutput")<{
  raw: string
}>() {}

/** The model replied, but not with a valid love interest JSON. */
export class InvalidInterestOutputError extends TaggedError(
  "InvalidInterestOutput"
)<{ raw: string }>() {}

/** A save file did not match the expected snapshot shape. */
export class InvalidSnapshotError extends TaggedError("InvalidSnapshot")() {}

export const SNAPSHOT_VERSION = 1 as const

/** A self-contained, portable save: a flirtation plus everything attached. */
export interface FlirtationSnapshot {
  version: typeof SNAPSHOT_VERSION
  flirtation: Flirtation
  messages: ChatMessage[]
  beats: Beat[]
}

const isSnapshot = (value: unknown): value is FlirtationSnapshot => {
  if (typeof value !== "object" || value === null) return false
  const s = value as Record<string, unknown>
  const flirtation = s.flirtation as Record<string, unknown> | undefined
  return (
    s.version === SNAPSHOT_VERSION &&
    typeof flirtation === "object" &&
    flirtation !== null &&
    typeof flirtation.scenario === "string" &&
    typeof flirtation.interest === "object" &&
    Array.isArray(s.messages) &&
    Array.isArray(s.beats)
  )
}

export type AdvanceError =
  | FlirtationNotFoundError
  | FlirtationEndedError
  | MissingApiKeyError
  | InvalidBeatOutputError
  | CompletionError
  | FlirtationStoreError

export type GenerateInterestError =
  | MissingApiKeyError
  | InvalidInterestOutputError
  | CompletionError

/** Fallback content language when a flirtation does not specify one. */
export const DEFAULT_LANGUAGE = "English"

/**
 * Sentinel model id meaning "rotate between the best free models each beat".
 * Stored on the flirtation; the client resolves it to a concrete model per
 * beat via AdvanceOptions.modelOverride.
 */
export const ROTATE_FREE_MODELS = "auto:rotate-free"

/**
 * Default per-beat completion cap. A beat's JSON (narration + moves + state)
 * fits comfortably here, and bounding it keeps OpenRouter from reserving a
 * model's full max output against the player's balance, which otherwise 402s
 * small/free-tier accounts before a beat even runs.
 */
export const DEFAULT_MAX_OUTPUT_TOKENS = 4096

export interface EngineConfig {
  store: FlirtationStore
  /** Returns the player's OpenRouter key, or null when disconnected. */
  getApiKey: () => string | null
  /**
   * Optional OpenAI-compatible API root to use instead of OpenRouter (e.g. a
   * local Ollama or LiteLLM endpoint). Returns null to use OpenRouter. When a
   * base URL is set, beats run even without an API key (local endpoints are
   * often keyless).
   */
  getBaseUrl?: () => string | null
  /** Model id used for new flirtations. */
  model?: string
  /** How many history messages to send to the model each beat. */
  historyWindow?: number
  /** Cap on completion tokens per beat. */
  maxOutputTokens?: number
}

export interface CreateFlirtationInput {
  scenario: Scenario
  /** The person the player is trying to win over. */
  interest: LoveInterest
  premise: string
  /** Optional explicit title; derived from the interest name when blank. */
  title?: string
  /** Override the engine-level model for this flirtation. */
  model?: string
  /** Language (English name) for generated content; defaults to English. */
  language?: string
}

export interface GenerateInterestInput {
  scenario: Scenario
  /** The premise the player set, if any, to ground the person. */
  premise?: string
  /** A name or concept the player already has in mind, if any. */
  hint?: string
  /** Partly-filled fields to keep; the model fills only the blanks. */
  seed?: Partial<LoveInterest>
  /** Language (English name) for generated content; defaults to English. */
  language?: string
  /** Concrete model to use instead of the engine default. */
  model?: string
  /** Fallback models OpenRouter routes to if the model errors/limits. */
  fallbackModels?: string[]
}

export interface AdvanceOptions {
  /**
   * The line or move the player chose or typed. Ignored for the opening beat
   * (when the flirtation has no beats yet).
   */
  move?: string
  /** Fallback models OpenRouter routes to if the model errors/limits. */
  fallbackModels?: string[]
  /**
   * Concrete model to use for this beat instead of the flirtation's stored
   * model. Used to resolve the ROTATE_FREE_MODELS sentinel per beat.
   */
  modelOverride?: string
}

const newId = () => crypto.randomUUID()

/** The non-blank fields of a love interest seed, trimmed. */
const trimmedSeed = (seed?: Partial<LoveInterest>): Partial<LoveInterest> => {
  if (!seed) return {}
  const out: Partial<LoveInterest> = {}
  for (const [key, value] of Object.entries(seed)) {
    if (value && value.trim()) out[key as keyof LoveInterest] = value.trim()
  }
  return out
}

/**
 * Orchestrates flirtations: creates them, advances the encounter one beat at a
 * time, and keeps every message and beat persisted through the
 * FlirtationStore. Stateless besides its config, so a single instance can
 * drive many flirtations.
 */
export class Engine {
  private readonly store: FlirtationStore
  private readonly getApiKey: () => string | null
  private readonly getBaseUrl: () => string | null
  private readonly model: string
  private readonly historyWindow: number
  private readonly maxOutputTokens: number

  constructor(config: EngineConfig) {
    this.store = config.store
    this.getApiKey = config.getApiKey
    this.getBaseUrl = config.getBaseUrl ?? (() => null)
    this.model = config.model ?? DEFAULT_MODEL
    this.historyWindow = config.historyWindow ?? 16
    this.maxOutputTokens = config.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS
  }

  /**
   * Creates a flirtation and records its system prompt as the first message,
   * so the full conversation is reconstructable from the store alone. The
   * opening beat is generated on the first advance() call.
   */
  async createFlirtation(
    input: CreateFlirtationInput
  ): Promise<Result<Flirtation, FlirtationStoreError>> {
    const now = Date.now()
    const name = input.interest.name.trim() || "a stranger"
    const interest: LoveInterest = { ...input.interest, name }
    const flirtation: Flirtation = {
      id: newId(),
      title: input.title?.trim() || name,
      scenario: input.scenario,
      premise: input.premise.trim(),
      interest,
      status: "active",
      model: input.model ?? this.model,
      language: input.language ?? DEFAULT_LANGUAGE,
      createdAt: now,
      updatedAt: now,
    }

    const saved = await this.store.saveFlirtation(flirtation)
    if (saved.isErr()) return Result.err(saved.error)

    const recorded = await this.store.appendMessages(flirtation.id, [
      {
        id: newId(),
        flirtationId: flirtation.id,
        role: "system",
        content: buildSystemPrompt(flirtation),
        createdAt: now,
      },
    ])
    if (recorded.isErr()) return Result.err(recorded.error)

    return Result.ok(flirtation)
  }

  /**
   * Generates a full, coherent love interest for a not-yet-created flirtation,
   * fitting the scenario and premise. Any fields passed in `seed` are
   * preserved; the model fills the rest. Used by the onboarding "generate with
   * AI" flow, so it does not touch the store.
   */
  async generateInterest(
    input: GenerateInterestInput
  ): Promise<Result<LoveInterest, GenerateInterestError>> {
    const baseUrl = this.getBaseUrl() ?? undefined
    const apiKey = this.getApiKey()
    if (!apiKey && !baseUrl) {
      return Result.err(new MissingApiKeyError())
    }

    const prompt = buildInterestPrompt({
      scenario: input.scenario,
      premise: input.premise,
      hint: input.hint,
      seed: input.seed,
      language: input.language ?? DEFAULT_LANGUAGE,
    })

    const completion = await requestCompletion({
      apiKey: apiKey ?? "",
      baseUrl,
      model: input.model ?? this.model,
      fallbackModels: input.fallbackModels,
      maxTokens: this.maxOutputTokens,
      messages: [{ role: "user", content: prompt }],
      schema: {
        name: "love_interest",
        schema: z.toJSONSchema(LoveInterestSchema) as Record<string, unknown>,
      },
    })
    if (completion.isErr()) return Result.err(completion.error)

    const parsed = Result.try({
      try: () => LoveInterestSchema.parse(JSON.parse(completion.value)),
      catch: () => new InvalidInterestOutputError({ raw: completion.value }),
    })
    if (parsed.isErr()) return Result.err(parsed.error)

    // Keep the player's seeded fields verbatim over anything the model echoed.
    return Result.ok({ ...parsed.value, ...trimmedSeed(input.seed) })
  }

  async listFlirtations(): Promise<Result<Flirtation[], FlirtationStoreError>> {
    return this.store.listFlirtations()
  }

  async getFlirtation(
    flirtationId: string
  ): Promise<
    Result<Flirtation, FlirtationNotFoundError | FlirtationStoreError>
  > {
    const flirtation = await this.store.getFlirtation(flirtationId)
    if (flirtation.isErr()) return Result.err(flirtation.error)
    if (flirtation.value === null) {
      return Result.err(new FlirtationNotFoundError({ flirtationId }))
    }
    return Result.ok(flirtation.value)
  }

  async deleteFlirtation(
    flirtationId: string
  ): Promise<Result<void, FlirtationStoreError>> {
    return this.store.deleteFlirtation(flirtationId)
  }

  /** Switches the OpenRouter model a flirtation uses for future beats. */
  async setFlirtationModel(
    flirtationId: string,
    model: string
  ): Promise<
    Result<Flirtation, FlirtationNotFoundError | FlirtationStoreError>
  > {
    const loaded = await this.getFlirtation(flirtationId)
    if (loaded.isErr()) return Result.err(loaded.error)
    const updated: Flirtation = {
      ...loaded.value,
      model,
      updatedAt: Date.now(),
    }
    const saved = await this.store.saveFlirtation(updated)
    if (saved.isErr()) return Result.err(saved.error)
    return Result.ok(updated)
  }

  /** Full conversation log, oldest first. */
  async getMessages(
    flirtationId: string
  ): Promise<Result<ChatMessage[], FlirtationStoreError>> {
    return this.store.listMessages(flirtationId)
  }

  /** All beats so far, oldest first: the encounter. */
  async getEncounter(
    flirtationId: string
  ): Promise<Result<Beat[], FlirtationStoreError>> {
    const beats = await this.store.listBeats(flirtationId)
    return beats.map(toEncounter)
  }

  /**
   * Advances the encounter by one beat. On the first call (no beats yet) it
   * generates the opening; afterwards it continues from the player's move.
   * Persists the prompt, the model's reply, and the new beat, and marks the
   * flirtation ended when the encounter concludes.
   */
  async advance(
    flirtationId: string,
    options: AdvanceOptions = {}
  ): Promise<Result<AdvanceResult, AdvanceError>> {
    const loaded = await this.getFlirtation(flirtationId)
    if (loaded.isErr()) return Result.err(loaded.error)
    const flirtation = loaded.value

    if (flirtation.status === "ended") {
      return Result.err(new FlirtationEndedError({ flirtationId }))
    }

    const baseUrl = this.getBaseUrl() ?? undefined
    const apiKey = this.getApiKey()
    // A custom (local) base URL may be keyless; only OpenRouter needs a key.
    if (!apiKey && !baseUrl) {
      return Result.err(new MissingApiKeyError())
    }

    const existingBeats = await this.store.listBeats(flirtationId)
    if (existingBeats.isErr()) return Result.err(existingBeats.error)
    const encounter = toEncounter(existingBeats.value)
    const isOpening = encounter.length === 0
    const lastBeat = encounter[encounter.length - 1]
    const priorState: MoodState = lastBeat?.state ?? EMPTY_STATE
    const move = (options.move ?? "").trim()

    const history = await this.store.listMessages(flirtationId)
    if (history.isErr()) return Result.err(history.error)

    const beatPrompt = isOpening
      ? buildOpeningPrompt(flirtation)
      : buildContinuePrompt({
          flirtation,
          state: priorState,
          move: move || "Continue.",
        })

    const completion = await requestCompletion({
      apiKey: apiKey ?? "",
      baseUrl,
      model: options.modelOverride ?? flirtation.model,
      fallbackModels: options.fallbackModels,
      maxTokens: this.maxOutputTokens,
      messages: [
        ...this.windowedHistory(history.value, flirtation),
        { role: "user", content: beatPrompt },
      ],
      schema: {
        name: "beat",
        schema: z.toJSONSchema(BeatOutputSchema) as Record<string, unknown>,
      },
    })
    if (completion.isErr()) return Result.err(completion.error)

    const parsed = Result.try({
      try: () => BeatOutputSchema.parse(JSON.parse(completion.value)),
      catch: () => new InvalidBeatOutputError({ raw: completion.value }),
    })
    if (parsed.isErr()) return Result.err(parsed.error)
    const output = parsed.value

    const now = Date.now()
    // Attraction at the floor or ceiling ends the encounter on its own, even
    // if the model did not flag it: they walk away, or they're won over.
    const walkedAway = output.state.attraction <= 0
    const smitten = output.state.attraction >= 100
    const isEnding = output.isEnding || walkedAway || smitten
    const endingKind = isEnding
      ? walkedAway
        ? "rejected"
        : smitten
          ? "smitten"
          : (output.endingKind ?? "open")
      : null
    const beat: Beat = {
      id: newId(),
      flirtationId,
      index: encounter.length,
      chosenMove: isOpening ? null : move || null,
      narration: output.narration,
      // An ending has no onward moves, regardless of what the model sent.
      moves: isEnding ? [] : output.moves,
      state: {
        attraction: output.state.attraction,
        mood: output.state.mood,
        location: output.state.location,
        chemistry: output.state.chemistry,
        missteps: output.state.missteps,
        read: output.state.read,
      },
      isEnding,
      endingKind,
      createdAt: now,
    }

    const updatedFlirtation: Flirtation = {
      ...flirtation,
      status: isEnding ? "ended" : "active",
      updatedAt: now,
    }

    // Persist the beat. Order matters: messages first so the conversation is
    // never missing a turn that produced a visible beat.
    const writes: Array<Result<void, FlirtationStoreError>> = [
      await this.store.appendMessages(flirtationId, [
        {
          id: newId(),
          flirtationId,
          role: "user",
          content: beatPrompt,
          createdAt: now,
        },
        {
          id: newId(),
          flirtationId,
          role: "assistant",
          content: completion.value,
          createdAt: now,
        },
      ]),
      await this.store.appendBeats(flirtationId, [beat]),
      await this.store.saveFlirtation(updatedFlirtation),
    ]
    for (const write of writes) {
      if (write.isErr()) return Result.err(write.error)
    }

    return Result.ok({ flirtation: updatedFlirtation, beat })
  }

  /**
   * System prompt plus the most recent messages, so long encounters do not
   * grow the request without bound. Older context survives implicitly: each
   * beat's narration carries the encounter forward and the model is asked to
   * stay consistent.
   */
  private windowedHistory(
    history: ChatMessage[],
    flirtation: Flirtation
  ): CompletionMessage[] {
    const system = history.find((message) => message.role === "system")
    const rest = history.filter((message) => message.role !== "system")
    const recent = rest.slice(-this.historyWindow)
    return [
      {
        role: "system" as const,
        content: system?.content ?? buildSystemPrompt(flirtation),
      },
      ...recent.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ]
  }

  /** Gathers a flirtation and all its attached data into a portable snapshot. */
  async exportFlirtation(
    flirtationId: string
  ): Promise<
    Result<FlirtationSnapshot, FlirtationNotFoundError | FlirtationStoreError>
  > {
    const flirtation = await this.getFlirtation(flirtationId)
    if (flirtation.isErr()) return Result.err(flirtation.error)

    const [messages, beats] = await Promise.all([
      this.store.listMessages(flirtationId),
      this.store.listBeats(flirtationId),
    ])
    if (messages.isErr()) return Result.err(messages.error)
    if (beats.isErr()) return Result.err(beats.error)

    return Result.ok({
      version: SNAPSHOT_VERSION,
      flirtation: flirtation.value,
      messages: messages.value,
      beats: beats.value,
    })
  }

  /**
   * Restores a snapshot as a brand-new flirtation: a fresh id is minted and
   * every attached record is re-pointed at it, so importing never clobbers an
   * existing flirtation and the same file can be imported more than once.
   */
  async importFlirtation(
    snapshot: unknown
  ): Promise<Result<Flirtation, InvalidSnapshotError | FlirtationStoreError>> {
    if (!isSnapshot(snapshot)) return Result.err(new InvalidSnapshotError())

    const now = Date.now()
    const id = newId()
    const flirtation: Flirtation = { ...snapshot.flirtation, id, updatedAt: now }
    const reId = <T extends { flirtationId: string }>(record: T): T => ({
      ...record,
      flirtationId: id,
    })

    const saved = await this.store.saveFlirtation(flirtation)
    if (saved.isErr()) return Result.err(saved.error)
    const messages = await this.store.appendMessages(
      id,
      snapshot.messages.map(reId)
    )
    if (messages.isErr()) return Result.err(messages.error)
    const beats = await this.store.appendBeats(id, snapshot.beats.map(reId))
    if (beats.isErr()) return Result.err(beats.error)

    return Result.ok(flirtation)
  }
}
