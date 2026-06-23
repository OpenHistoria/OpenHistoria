import { Result, TaggedError } from "better-result"
import { z } from "zod"

import {
  DEFAULT_MODEL,
  requestCompletion,
  type CompletionError,
  type CompletionMessage,
} from "@workspace/engine/openrouter"

import {
  buildAccusationPrompt,
  buildCaseFilePrompt,
  buildContinuePrompt,
  buildDetectivePrompt,
  buildOpeningPrompt,
  buildSystemPrompt,
} from "@workspace/detective-engine/prompts"
import type { CaseStore, CaseStoreError } from "@workspace/detective-engine/store"
import {
  CaseFileSchema,
  DetectiveSchema,
  EMPTY_STATE,
  RoundOutputSchema,
  toInvestigation,
  type AccusationResult,
  type AdvanceResult,
  type Case,
  type CaseOutcome,
  type CaseState,
  type ChatMessage,
  type Detective,
  type Difficulty,
  type Round,
  type Setting,
} from "@workspace/detective-engine/types"

/** No case with that id in the store. */
export class CaseNotFoundError extends TaggedError("CaseNotFound")<{
  caseId: string
}>() {}

/** The case is already closed; it cannot be advanced or accused further. */
export class CaseClosedError extends TaggedError("CaseClosed")<{
  caseId: string
}>() {}

/** No OpenRouter key available; the player must connect first. */
export class MissingApiKeyError extends TaggedError("MissingApiKey")() {}

/** The model replied, but not with a valid round JSON. */
export class InvalidRoundOutputError extends TaggedError("InvalidRoundOutput")<{
  raw: string
}>() {}

/** The model replied, but not with a valid case file JSON. */
export class InvalidCaseFileOutputError extends TaggedError(
  "InvalidCaseFileOutput"
)<{ raw: string }>() {}

/** The model replied, but not with a valid detective JSON. */
export class InvalidDetectiveOutputError extends TaggedError(
  "InvalidDetectiveOutput"
)<{ raw: string }>() {}

export type CreateCaseError =
  | MissingApiKeyError
  | InvalidCaseFileOutputError
  | CompletionError
  | CaseStoreError

export type GenerateDetectiveError =
  | MissingApiKeyError
  | InvalidDetectiveOutputError
  | CompletionError

export type AdvanceError =
  | CaseNotFoundError
  | CaseClosedError
  | MissingApiKeyError
  | InvalidRoundOutputError
  | CompletionError
  | CaseStoreError

export type AccuseError =
  | CaseNotFoundError
  | CaseClosedError
  | MissingApiKeyError
  | CompletionError
  | CaseStoreError

/** Fallback content language when a case does not specify one. */
export const DEFAULT_LANGUAGE = "English"

/**
 * Default per-call completion cap. A round's JSON (narration + actions +
 * state) fits comfortably here, and bounding it keeps OpenRouter from
 * reserving a model's full max output against the player's balance, which
 * otherwise 402s small/free-tier accounts before a call even runs. Case-file
 * generation gets a larger cap since the whole dossier comes back at once.
 */
export const DEFAULT_MAX_OUTPUT_TOKENS = 4096
export const CASE_FILE_MAX_OUTPUT_TOKENS = 6144
/** A single detective persona is small; a tight cap keeps the call cheap. */
export const DETECTIVE_MAX_OUTPUT_TOKENS = 1024

export interface EngineConfig {
  store: CaseStore
  /** Returns the player's OpenRouter key, or null when disconnected. */
  getApiKey: () => string | null
  /**
   * Optional OpenAI-compatible API root to use instead of OpenRouter (e.g. a
   * local Ollama or LiteLLM endpoint). Returns null to use OpenRouter. When a
   * base URL is set, calls run even without an API key (local endpoints are
   * often keyless).
   */
  getBaseUrl?: () => string | null
  /** Model id used for new cases. */
  model?: string
  /** How many history messages to send to the model each round. */
  historyWindow?: number
  /** Cap on completion tokens per round. */
  maxOutputTokens?: number
}

export interface CreateCaseInput {
  setting: Setting
  difficulty: Difficulty
  /** The detective the case is told around. */
  detective: Detective
  premise: string
  /** Override the engine-level model for this case. */
  model?: string
  /** Fallback models OpenRouter routes to if the model errors/limits. */
  fallbackModels?: string[]
  /** Language (English name) for generated content; defaults to English. */
  language?: string
}

export interface GenerateDetectiveInput {
  /** The setting the detective should fit. */
  setting: Setting
  /** The case hook, if any, to tilt the persona toward the case. */
  premise?: string
  /** Override the engine-level model for this generation. */
  model?: string
  /** Fallback models OpenRouter routes to if the model errors/limits. */
  fallbackModels?: string[]
  /** Language (English name) for generated content; defaults to English. */
  language?: string
}

export interface AdvanceOptions {
  /**
   * The action the player chose or typed. Ignored for the opening round (when
   * the case has no rounds yet).
   */
  action?: string
  /** Fallback models OpenRouter routes to if the model errors/limits. */
  fallbackModels?: string[]
  /** Concrete model to use for this round instead of the case's stored model. */
  modelOverride?: string
}

export interface AccuseInput {
  /** The suspect the player names as the culprit. */
  accused: string
  /** The player's reasoning / proposed motive and method, if any. */
  reasoning?: string
  fallbackModels?: string[]
  modelOverride?: string
}

const newId = () => crypto.randomUUID()

/** Loose name match, so "the butler, James" still convicts "James". */
const namesMatch = (a: string, b: string): boolean => {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim()
  const x = norm(a)
  const y = norm(b)
  if (!x || !y) return false
  return x === y || x.includes(y) || y.includes(x)
}

/**
 * Orchestrates detective cases: invents them, advances the investigation one
 * round at a time, and resolves the accusation - keeping every message and
 * round persisted through the CaseStore. Stateless besides its config, so a
 * single instance can drive many cases.
 */
export class Engine {
  private readonly store: CaseStore
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
   * Invents a complete mystery (victim, suspects, hidden solution) fitting the
   * setting, difficulty, and premise, persists it as a new case, and records
   * the system prompt as the first message so the full conversation is
   * reconstructable from the store alone. The opening round is generated on
   * the first advance() call.
   */
  async createCase(
    input: CreateCaseInput
  ): Promise<Result<Case, CreateCaseError>> {
    const baseUrl = this.getBaseUrl() ?? undefined
    const apiKey = this.getApiKey()
    if (!apiKey && !baseUrl) return Result.err(new MissingApiKeyError())

    const language = input.language ?? DEFAULT_LANGUAGE
    const name = input.detective.name.trim() || "the Detective"
    const detective: Detective = { ...input.detective, name }
    const model = input.model ?? this.model

    const prompt = buildCaseFilePrompt({
      setting: input.setting,
      difficulty: input.difficulty,
      premise: input.premise.trim() || undefined,
      detective,
      language,
    })

    const completion = await requestCompletion({
      apiKey: apiKey ?? "",
      baseUrl,
      model,
      fallbackModels: input.fallbackModels,
      maxTokens: CASE_FILE_MAX_OUTPUT_TOKENS,
      messages: [{ role: "user", content: prompt }],
      schema: {
        name: "case_file",
        schema: z.toJSONSchema(CaseFileSchema) as Record<string, unknown>,
      },
    })
    if (completion.isErr()) return Result.err(completion.error)

    const parsed = Result.try({
      try: () => CaseFileSchema.parse(JSON.parse(completion.value)),
      catch: () => new InvalidCaseFileOutputError({ raw: completion.value }),
    })
    if (parsed.isErr()) return Result.err(parsed.error)
    const file = parsed.value

    const now = Date.now()
    const theCase: Case = {
      id: newId(),
      title: file.title.trim() || "An Untitled Case",
      setting: input.setting,
      difficulty: input.difficulty,
      premise: input.premise.trim(),
      detective,
      victim: file.victim,
      crimeSummary: file.crimeSummary,
      suspects: file.suspects,
      solution: file.solution,
      status: "active",
      model,
      language,
      createdAt: now,
      updatedAt: now,
    }

    const saved = await this.store.saveCase(theCase)
    if (saved.isErr()) return Result.err(saved.error)

    const recorded = await this.store.appendMessages(theCase.id, [
      {
        id: newId(),
        caseId: theCase.id,
        role: "system",
        content: buildSystemPrompt(theCase),
        createdAt: now,
      },
    ])
    if (recorded.isErr()) return Result.err(recorded.error)

    return Result.ok(theCase)
  }

  /**
   * Invents a single detective persona fitting the chosen setting (and premise,
   * if any) for the player to start from. Nothing is persisted - the caller
   * decides whether to keep, edit, or discard it before opening a case.
   */
  async generateDetective(
    input: GenerateDetectiveInput
  ): Promise<Result<Detective, GenerateDetectiveError>> {
    const baseUrl = this.getBaseUrl() ?? undefined
    const apiKey = this.getApiKey()
    if (!apiKey && !baseUrl) return Result.err(new MissingApiKeyError())

    const language = input.language ?? DEFAULT_LANGUAGE
    const model = input.model ?? this.model

    const prompt = buildDetectivePrompt({
      setting: input.setting,
      premise: input.premise?.trim() || undefined,
      language,
    })

    const completion = await requestCompletion({
      apiKey: apiKey ?? "",
      baseUrl,
      model,
      fallbackModels: input.fallbackModels,
      maxTokens: DETECTIVE_MAX_OUTPUT_TOKENS,
      messages: [{ role: "user", content: prompt }],
      schema: {
        name: "detective",
        schema: z.toJSONSchema(DetectiveSchema) as Record<string, unknown>,
      },
    })
    if (completion.isErr()) return Result.err(completion.error)

    const parsed = Result.try({
      try: () => DetectiveSchema.parse(JSON.parse(completion.value)),
      catch: () => new InvalidDetectiveOutputError({ raw: completion.value }),
    })
    if (parsed.isErr()) return Result.err(parsed.error)

    return Result.ok(parsed.value)
  }

  async listCases(): Promise<Result<Case[], CaseStoreError>> {
    return this.store.listCases()
  }

  async getCase(
    caseId: string
  ): Promise<Result<Case, CaseNotFoundError | CaseStoreError>> {
    const theCase = await this.store.getCase(caseId)
    if (theCase.isErr()) return Result.err(theCase.error)
    if (theCase.value === null) {
      return Result.err(new CaseNotFoundError({ caseId }))
    }
    return Result.ok(theCase.value)
  }

  async deleteCase(caseId: string): Promise<Result<void, CaseStoreError>> {
    return this.store.deleteCase(caseId)
  }

  /** Switches the OpenRouter model a case uses for future rounds. */
  async setCaseModel(
    caseId: string,
    model: string
  ): Promise<Result<Case, CaseNotFoundError | CaseStoreError>> {
    const loaded = await this.getCase(caseId)
    if (loaded.isErr()) return Result.err(loaded.error)
    const updated: Case = { ...loaded.value, model, updatedAt: Date.now() }
    const saved = await this.store.saveCase(updated)
    if (saved.isErr()) return Result.err(saved.error)
    return Result.ok(updated)
  }

  /** Full conversation log, oldest first. */
  async getMessages(
    caseId: string
  ): Promise<Result<ChatMessage[], CaseStoreError>> {
    return this.store.listMessages(caseId)
  }

  /** All rounds so far, oldest first: the investigation. */
  async getInvestigation(
    caseId: string
  ): Promise<Result<Round[], CaseStoreError>> {
    const rounds = await this.store.listRounds(caseId)
    return rounds.map(toInvestigation)
  }

  /**
   * Advances the investigation by one round. On the first call (no rounds yet)
   * it generates the opening; afterwards it continues from the player's
   * action. Persists the prompt, the model's reply, and the new round.
   */
  async advance(
    caseId: string,
    options: AdvanceOptions = {}
  ): Promise<Result<AdvanceResult, AdvanceError>> {
    const loaded = await this.getCase(caseId)
    if (loaded.isErr()) return Result.err(loaded.error)
    const theCase = loaded.value

    if (theCase.status !== "active") {
      return Result.err(new CaseClosedError({ caseId }))
    }

    const baseUrl = this.getBaseUrl() ?? undefined
    const apiKey = this.getApiKey()
    if (!apiKey && !baseUrl) return Result.err(new MissingApiKeyError())

    const existingRounds = await this.store.listRounds(caseId)
    if (existingRounds.isErr()) return Result.err(existingRounds.error)
    const investigation = toInvestigation(existingRounds.value)
    const isOpening = investigation.length === 0
    const lastRound = investigation[investigation.length - 1]
    const priorState: CaseState = lastRound?.state ?? EMPTY_STATE
    const action = (options.action ?? "").trim()

    const history = await this.store.listMessages(caseId)
    if (history.isErr()) return Result.err(history.error)

    const roundPrompt = isOpening
      ? buildOpeningPrompt(theCase)
      : buildContinuePrompt({
          theCase,
          state: priorState,
          action: action || "Continue the investigation.",
        })

    const completion = await requestCompletion({
      apiKey: apiKey ?? "",
      baseUrl,
      model: options.modelOverride ?? theCase.model,
      fallbackModels: options.fallbackModels,
      maxTokens: this.maxOutputTokens,
      messages: [
        ...this.windowedHistory(history.value, theCase),
        { role: "user", content: roundPrompt },
      ],
      schema: {
        name: "round",
        schema: z.toJSONSchema(RoundOutputSchema) as Record<string, unknown>,
      },
    })
    if (completion.isErr()) return Result.err(completion.error)

    const parsed = Result.try({
      try: () => RoundOutputSchema.parse(JSON.parse(completion.value)),
      catch: () => new InvalidRoundOutputError({ raw: completion.value }),
    })
    if (parsed.isErr()) return Result.err(parsed.error)
    const output = parsed.value

    const now = Date.now()
    const round: Round = {
      id: newId(),
      caseId,
      index: investigation.length,
      chosenAction: isOpening ? null : action || null,
      narration: output.narration,
      choices: output.choices,
      state: {
        location: output.state.location,
        clues: output.state.clues,
        leads: output.state.leads,
        cleared: output.state.cleared,
      },
      outcome: null,
      createdAt: now,
    }

    const updatedCase: Case = { ...theCase, updatedAt: now }

    const write = await this.persistRound(
      caseId,
      roundPrompt,
      completion.value,
      round,
      updatedCase
    )
    if (write.isErr()) return Result.err(write.error)

    return Result.ok({ case: updatedCase, round })
  }

  /**
   * Resolves the case: the player names a culprit and the confrontation plays
   * out. The verdict is decided in code by matching the accused to the hidden
   * culprit (so the model cannot fudge it), and the model stages the reveal as
   * prose. Closes the case as solved or failed.
   */
  async accuse(
    caseId: string,
    input: AccuseInput
  ): Promise<Result<AccusationResult, AccuseError>> {
    const loaded = await this.getCase(caseId)
    if (loaded.isErr()) return Result.err(loaded.error)
    const theCase = loaded.value

    if (theCase.status !== "active") {
      return Result.err(new CaseClosedError({ caseId }))
    }

    const baseUrl = this.getBaseUrl() ?? undefined
    const apiKey = this.getApiKey()
    if (!apiKey && !baseUrl) return Result.err(new MissingApiKeyError())

    const correct = namesMatch(input.accused, theCase.solution.culprit)
    const outcome: CaseOutcome = correct ? "solved" : "failed"

    const history = await this.store.listMessages(caseId)
    if (history.isErr()) return Result.err(history.error)

    const existingRounds = await this.store.listRounds(caseId)
    if (existingRounds.isErr()) return Result.err(existingRounds.error)
    const investigation = toInvestigation(existingRounds.value)
    const priorState: CaseState =
      investigation[investigation.length - 1]?.state ?? EMPTY_STATE

    const accusationPrompt = buildAccusationPrompt({
      theCase,
      accused: input.accused.trim(),
      reasoning: input.reasoning?.trim() ?? "",
      correct,
    })

    const completion = await requestCompletion({
      apiKey: apiKey ?? "",
      baseUrl,
      model: input.modelOverride ?? theCase.model,
      fallbackModels: input.fallbackModels,
      maxTokens: this.maxOutputTokens,
      messages: [
        ...this.windowedHistory(history.value, theCase),
        { role: "user", content: accusationPrompt },
      ],
    })
    if (completion.isErr()) return Result.err(completion.error)

    const now = Date.now()
    const round: Round = {
      id: newId(),
      caseId,
      index: investigation.length,
      chosenAction: `Accuse ${input.accused.trim()}`,
      narration: completion.value,
      choices: [],
      state: priorState,
      outcome,
      createdAt: now,
    }

    const updatedCase: Case = { ...theCase, status: outcome, updatedAt: now }

    const write = await this.persistRound(
      caseId,
      accusationPrompt,
      completion.value,
      round,
      updatedCase
    )
    if (write.isErr()) return Result.err(write.error)

    return Result.ok({ case: updatedCase, round, outcome })
  }

  /** Persists a round and its conversation turns, then saves the case. */
  private async persistRound(
    caseId: string,
    userPrompt: string,
    assistantReply: string,
    round: Round,
    updatedCase: Case
  ): Promise<Result<void, CaseStoreError>> {
    const now = round.createdAt
    const writes: Array<Result<void, CaseStoreError>> = [
      await this.store.appendMessages(caseId, [
        {
          id: newId(),
          caseId,
          role: "user",
          content: userPrompt,
          createdAt: now,
        },
        {
          id: newId(),
          caseId,
          role: "assistant",
          content: assistantReply,
          createdAt: now,
        },
      ]),
      await this.store.appendRounds(caseId, [round]),
      await this.store.saveCase(updatedCase),
    ]
    for (const w of writes) {
      if (w.isErr()) return Result.err(w.error)
    }
    return Result.ok(undefined)
  }

  /**
   * System prompt plus the most recent messages, so long investigations do not
   * grow the request without bound. Older context survives implicitly: each
   * round's narration and the persisted state carry the case forward.
   */
  private windowedHistory(
    history: ChatMessage[],
    theCase: Case
  ): CompletionMessage[] {
    const system = history.find((message) => message.role === "system")
    const rest = history.filter((message) => message.role !== "system")
    const recent = rest.slice(-this.historyWindow)
    return [
      {
        role: "system" as const,
        content: system?.content ?? buildSystemPrompt(theCase),
      },
      ...recent.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ]
  }
}
