import { Result, TaggedError } from "better-result"
import { z } from "zod"

import {
  DEFAULT_MODEL,
  requestCompletion,
  type CompletionError,
  type CompletionMessage,
} from "@workspace/engine/openrouter"

import {
  buildCharacterPrompt,
  buildContinuePrompt,
  buildOpeningPrompt,
  buildSystemPrompt,
} from "@workspace/adventure-engine/prompts"
import type {
  AdventureStore,
  AdventureStoreError,
} from "@workspace/adventure-engine/store"
import {
  CharacterSchema,
  EMPTY_STATE,
  SceneOutputSchema,
  toStory,
  type AdvanceResult,
  type Adventure,
  type Character,
  type ChatMessage,
  type Genre,
  type Scene,
  type StoryState,
} from "@workspace/adventure-engine/types"

/** No adventure with that id in the store. */
export class AdventureNotFoundError extends TaggedError("AdventureNotFound")<{
  adventureId: string
}>() {}

/** The story already reached an ending; it cannot be advanced further. */
export class AdventureEndedError extends TaggedError("AdventureEnded")<{
  adventureId: string
}>() {}

/** No OpenRouter key available; the player must connect first. */
export class MissingApiKeyError extends TaggedError("MissingApiKey")() {}

/** The model replied, but not with a valid scene JSON. */
export class InvalidSceneOutputError extends TaggedError("InvalidSceneOutput")<{
  raw: string
}>() {}

/** The model replied, but not with a valid character JSON. */
export class InvalidCharacterOutputError extends TaggedError(
  "InvalidCharacterOutput"
)<{ raw: string }>() {}

/** A save file did not match the expected snapshot shape. */
export class InvalidSnapshotError extends TaggedError("InvalidSnapshot")() {}

export const SNAPSHOT_VERSION = 1 as const

/** A self-contained, portable save: an adventure plus everything attached. */
export interface AdventureSnapshot {
  version: typeof SNAPSHOT_VERSION
  adventure: Adventure
  messages: ChatMessage[]
  scenes: Scene[]
}

const isSnapshot = (value: unknown): value is AdventureSnapshot => {
  if (typeof value !== "object" || value === null) return false
  const s = value as Record<string, unknown>
  const adventure = s.adventure as Record<string, unknown> | undefined
  return (
    s.version === SNAPSHOT_VERSION &&
    typeof adventure === "object" &&
    adventure !== null &&
    typeof adventure.protagonist === "string" &&
    typeof adventure.genre === "string" &&
    Array.isArray(s.messages) &&
    Array.isArray(s.scenes)
  )
}

export type AdvanceError =
  | AdventureNotFoundError
  | AdventureEndedError
  | MissingApiKeyError
  | InvalidSceneOutputError
  | CompletionError
  | AdventureStoreError

export type GenerateCharacterError =
  | MissingApiKeyError
  | InvalidCharacterOutputError
  | CompletionError

/** Fallback content language when an adventure does not specify one. */
export const DEFAULT_LANGUAGE = "English"

/**
 * Sentinel model id meaning "rotate between the best free models each scene".
 * Stored on the adventure; the client resolves it to a concrete model per
 * scene via AdvanceOptions.modelOverride.
 */
export const ROTATE_FREE_MODELS = "auto:rotate-free"

/**
 * Default per-scene completion cap. A scene's JSON (narration + choices +
 * state) fits comfortably here, and bounding it keeps OpenRouter from
 * reserving a model's full max output against the player's balance, which
 * otherwise 402s small/free-tier accounts before a scene even runs.
 */
export const DEFAULT_MAX_OUTPUT_TOKENS = 4096

export interface EngineConfig {
  store: AdventureStore
  /** Returns the player's OpenRouter key, or null when disconnected. */
  getApiKey: () => string | null
  /**
   * Optional OpenAI-compatible API root to use instead of OpenRouter (e.g. a
   * local Ollama or LiteLLM endpoint). Returns null to use OpenRouter. When a
   * base URL is set, scenes run even without an API key (local endpoints are
   * often keyless).
   */
  getBaseUrl?: () => string | null
  /** Model id used for new adventures. */
  model?: string
  /** How many history messages to send to the model each scene. */
  historyWindow?: number
  /** Cap on completion tokens per scene. */
  maxOutputTokens?: number
}

export interface CreateAdventureInput {
  genre: Genre
  /** The protagonist the story is told around. */
  character: Character
  premise: string
  /** Optional explicit title; derived from the character name when blank. */
  title?: string
  /** Override the engine-level model for this adventure. */
  model?: string
  /** Language (English name) for generated content; defaults to English. */
  language?: string
}

export interface GenerateCharacterInput {
  genre: Genre
  /** The premise the player set, if any, to ground the character. */
  premise?: string
  /** A name or concept the player already has in mind, if any. */
  hint?: string
  /** Partly-filled fields to keep; the model fills only the blanks. */
  seed?: Partial<Character>
  /** Language (English name) for generated content; defaults to English. */
  language?: string
  /** Concrete model to use instead of the engine default. */
  model?: string
  /** Fallback models OpenRouter routes to if the model errors/limits. */
  fallbackModels?: string[]
}

export interface AdvanceOptions {
  /**
   * The action the player chose or typed. Ignored for the opening scene (when
   * the adventure has no scenes yet).
   */
  action?: string
  /** Fallback models OpenRouter routes to if the model errors/limits. */
  fallbackModels?: string[]
  /**
   * Concrete model to use for this scene instead of the adventure's stored
   * model. Used to resolve the ROTATE_FREE_MODELS sentinel per scene.
   */
  modelOverride?: string
}

const newId = () => crypto.randomUUID()

/** The non-blank fields of a character seed, trimmed. */
const trimmedSeed = (seed?: Partial<Character>): Partial<Character> => {
  if (!seed) return {}
  const out: Partial<Character> = {}
  for (const [key, value] of Object.entries(seed)) {
    if (value && value.trim()) out[key as keyof Character] = value.trim()
  }
  return out
}

/**
 * Orchestrates adventures: creates them, advances the story one scene at a
 * time, and keeps every message and scene persisted through the
 * AdventureStore. Stateless besides its config, so a single instance can
 * drive many adventures.
 */
export class Engine {
  private readonly store: AdventureStore
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
   * Creates an adventure and records its system prompt as the first message,
   * so the full conversation is reconstructable from the store alone. The
   * opening scene is generated on the first advance() call.
   */
  async createAdventure(
    input: CreateAdventureInput
  ): Promise<Result<Adventure, AdventureStoreError>> {
    const now = Date.now()
    const name = input.character.name.trim() || "the Wanderer"
    const character: Character = { ...input.character, name }
    const adventure: Adventure = {
      id: newId(),
      title: input.title?.trim() || name,
      genre: input.genre,
      premise: input.premise.trim(),
      character,
      status: "active",
      model: input.model ?? this.model,
      language: input.language ?? DEFAULT_LANGUAGE,
      createdAt: now,
      updatedAt: now,
    }

    const saved = await this.store.saveAdventure(adventure)
    if (saved.isErr()) return Result.err(saved.error)

    const recorded = await this.store.appendMessages(adventure.id, [
      {
        id: newId(),
        adventureId: adventure.id,
        role: "system",
        content: buildSystemPrompt(adventure),
        createdAt: now,
      },
    ])
    if (recorded.isErr()) return Result.err(recorded.error)

    return Result.ok(adventure)
  }

  /**
   * Generates a full, coherent protagonist for a not-yet-created adventure,
   * fitting the genre and premise. Any fields passed in `seed` are preserved;
   * the model fills the rest. Used by the onboarding "generate with AI" flow,
   * so it does not touch the store.
   */
  async generateCharacter(
    input: GenerateCharacterInput
  ): Promise<Result<Character, GenerateCharacterError>> {
    const baseUrl = this.getBaseUrl() ?? undefined
    const apiKey = this.getApiKey()
    if (!apiKey && !baseUrl) {
      return Result.err(new MissingApiKeyError())
    }

    const prompt = buildCharacterPrompt({
      genre: input.genre,
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
        name: "character",
        schema: z.toJSONSchema(CharacterSchema) as Record<string, unknown>,
      },
    })
    if (completion.isErr()) return Result.err(completion.error)

    const parsed = Result.try({
      try: () => CharacterSchema.parse(JSON.parse(completion.value)),
      catch: () => new InvalidCharacterOutputError({ raw: completion.value }),
    })
    if (parsed.isErr()) return Result.err(parsed.error)

    // Keep the player's seeded fields verbatim over anything the model echoed.
    return Result.ok({ ...parsed.value, ...trimmedSeed(input.seed) })
  }

  async listAdventures(): Promise<Result<Adventure[], AdventureStoreError>> {
    return this.store.listAdventures()
  }

  async getAdventure(
    adventureId: string
  ): Promise<Result<Adventure, AdventureNotFoundError | AdventureStoreError>> {
    const adventure = await this.store.getAdventure(adventureId)
    if (adventure.isErr()) return Result.err(adventure.error)
    if (adventure.value === null) {
      return Result.err(new AdventureNotFoundError({ adventureId }))
    }
    return Result.ok(adventure.value)
  }

  async deleteAdventure(
    adventureId: string
  ): Promise<Result<void, AdventureStoreError>> {
    return this.store.deleteAdventure(adventureId)
  }

  /** Switches the OpenRouter model an adventure uses for future scenes. */
  async setAdventureModel(
    adventureId: string,
    model: string
  ): Promise<Result<Adventure, AdventureNotFoundError | AdventureStoreError>> {
    const loaded = await this.getAdventure(adventureId)
    if (loaded.isErr()) return Result.err(loaded.error)
    const updated: Adventure = { ...loaded.value, model, updatedAt: Date.now() }
    const saved = await this.store.saveAdventure(updated)
    if (saved.isErr()) return Result.err(saved.error)
    return Result.ok(updated)
  }

  /** Full conversation log, oldest first. */
  async getMessages(
    adventureId: string
  ): Promise<Result<ChatMessage[], AdventureStoreError>> {
    return this.store.listMessages(adventureId)
  }

  /** All scenes so far, oldest first: the story. */
  async getStory(
    adventureId: string
  ): Promise<Result<Scene[], AdventureStoreError>> {
    const scenes = await this.store.listScenes(adventureId)
    return scenes.map(toStory)
  }

  /**
   * Advances the story by one scene. On the first call (no scenes yet) it
   * generates the opening; afterwards it continues from the player's action.
   * Persists the prompt, the model's reply, and the new scene, and marks the
   * adventure ended when the model concludes the story.
   */
  async advance(
    adventureId: string,
    options: AdvanceOptions = {}
  ): Promise<Result<AdvanceResult, AdvanceError>> {
    const loaded = await this.getAdventure(adventureId)
    if (loaded.isErr()) return Result.err(loaded.error)
    const adventure = loaded.value

    if (adventure.status === "ended") {
      return Result.err(new AdventureEndedError({ adventureId }))
    }

    const baseUrl = this.getBaseUrl() ?? undefined
    const apiKey = this.getApiKey()
    // A custom (local) base URL may be keyless; only OpenRouter needs a key.
    if (!apiKey && !baseUrl) {
      return Result.err(new MissingApiKeyError())
    }

    const existingScenes = await this.store.listScenes(adventureId)
    if (existingScenes.isErr()) return Result.err(existingScenes.error)
    const story = toStory(existingScenes.value)
    const isOpening = story.length === 0
    const lastScene = story[story.length - 1]
    const priorState: StoryState = lastScene?.state ?? EMPTY_STATE
    const action = (options.action ?? "").trim()

    const history = await this.store.listMessages(adventureId)
    if (history.isErr()) return Result.err(history.error)

    const scenePrompt = isOpening
      ? buildOpeningPrompt(adventure)
      : buildContinuePrompt({
          adventure,
          state: priorState,
          action: action || "Continue.",
        })

    const completion = await requestCompletion({
      apiKey: apiKey ?? "",
      baseUrl,
      model: options.modelOverride ?? adventure.model,
      fallbackModels: options.fallbackModels,
      maxTokens: this.maxOutputTokens,
      messages: [
        ...this.windowedHistory(history.value, adventure),
        { role: "user", content: scenePrompt },
      ],
      schema: {
        name: "scene",
        schema: z.toJSONSchema(SceneOutputSchema) as Record<string, unknown>,
      },
    })
    if (completion.isErr()) return Result.err(completion.error)

    const parsed = Result.try({
      try: () => SceneOutputSchema.parse(JSON.parse(completion.value)),
      catch: () => new InvalidSceneOutputError({ raw: completion.value }),
    })
    if (parsed.isErr()) return Result.err(parsed.error)
    const output = parsed.value

    const now = Date.now()
    const isEnding = output.isEnding || output.state.health <= 0
    const scene: Scene = {
      id: newId(),
      adventureId,
      index: story.length,
      chosenAction: isOpening ? null : action || null,
      narration: output.narration,
      // An ending has no onward choices, regardless of what the model sent.
      choices: isEnding ? [] : output.choices,
      state: {
        location: output.state.location,
        health: output.state.health,
        inventory: output.state.inventory,
        companions: output.state.companions,
        objective: output.state.objective,
      },
      isEnding,
      endingKind: isEnding ? (output.endingKind ?? "open") : null,
      createdAt: now,
    }

    const updatedAdventure: Adventure = {
      ...adventure,
      status: isEnding ? "ended" : "active",
      updatedAt: now,
    }

    // Persist the scene. Order matters: messages first so the conversation is
    // never missing a turn that produced a visible scene.
    const writes: Array<Result<void, AdventureStoreError>> = [
      await this.store.appendMessages(adventureId, [
        {
          id: newId(),
          adventureId,
          role: "user",
          content: scenePrompt,
          createdAt: now,
        },
        {
          id: newId(),
          adventureId,
          role: "assistant",
          content: completion.value,
          createdAt: now,
        },
      ]),
      await this.store.appendScenes(adventureId, [scene]),
      await this.store.saveAdventure(updatedAdventure),
    ]
    for (const write of writes) {
      if (write.isErr()) return Result.err(write.error)
    }

    return Result.ok({ adventure: updatedAdventure, scene })
  }

  /**
   * System prompt plus the most recent messages, so long adventures do not
   * grow the request without bound. Older context survives implicitly: each
   * scene's narration carries the story forward and the model is asked to stay
   * consistent.
   */
  private windowedHistory(
    history: ChatMessage[],
    adventure: Adventure
  ): CompletionMessage[] {
    const system = history.find((message) => message.role === "system")
    const rest = history.filter((message) => message.role !== "system")
    const recent = rest.slice(-this.historyWindow)
    return [
      {
        role: "system" as const,
        content: system?.content ?? buildSystemPrompt(adventure),
      },
      ...recent.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ]
  }

  /** Gathers an adventure and all its attached data into a portable snapshot. */
  async exportAdventure(
    adventureId: string
  ): Promise<
    Result<AdventureSnapshot, AdventureNotFoundError | AdventureStoreError>
  > {
    const adventure = await this.getAdventure(adventureId)
    if (adventure.isErr()) return Result.err(adventure.error)

    const [messages, scenes] = await Promise.all([
      this.store.listMessages(adventureId),
      this.store.listScenes(adventureId),
    ])
    if (messages.isErr()) return Result.err(messages.error)
    if (scenes.isErr()) return Result.err(scenes.error)

    return Result.ok({
      version: SNAPSHOT_VERSION,
      adventure: adventure.value,
      messages: messages.value,
      scenes: scenes.value,
    })
  }

  /**
   * Restores a snapshot as a brand-new adventure: a fresh id is minted and
   * every attached record is re-pointed at it, so importing never clobbers an
   * existing adventure and the same file can be imported more than once.
   */
  async importAdventure(
    snapshot: unknown
  ): Promise<Result<Adventure, InvalidSnapshotError | AdventureStoreError>> {
    if (!isSnapshot(snapshot)) return Result.err(new InvalidSnapshotError())

    const now = Date.now()
    const id = newId()
    const adventure: Adventure = { ...snapshot.adventure, id, updatedAt: now }
    const reId = <T extends { adventureId: string }>(record: T): T => ({
      ...record,
      adventureId: id,
    })

    const saved = await this.store.saveAdventure(adventure)
    if (saved.isErr()) return Result.err(saved.error)
    const messages = await this.store.appendMessages(
      id,
      snapshot.messages.map(reId)
    )
    if (messages.isErr()) return Result.err(messages.error)
    const scenes = await this.store.appendScenes(id, snapshot.scenes.map(reId))
    if (scenes.isErr()) return Result.err(scenes.error)

    return Result.ok(adventure)
  }
}
