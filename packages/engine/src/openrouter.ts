import { Result, TaggedError } from "better-result"

/**
 * Minimal chat-completions client speaking the OpenAI-compatible API. By
 * default it targets OpenRouter (the app handles the PKCE flow and key storage
 * in apps/web/lib/openrouter.ts; this module only spends the resulting key),
 * but `baseUrl` can point it at any OpenAI-compatible endpoint - a local
 * Ollama, a LiteLLM proxy, vLLM, etc. - so OpenRouter can be overridden
 * entirely. Structured outputs (json_schema) are used so turn results come
 * back as validated JSON instead of free text.
 */

/** OpenAI-compatible API root used when no override is supplied. */
export const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"

/** Builds the chat-completions endpoint from an API root, trimming slashes. */
const completionsUrl = (baseUrl: string) =>
  `${baseUrl.replace(/\/+$/, "")}/chat/completions`

/** Reasonable default; games can override via EngineConfig.model. */
export const DEFAULT_MODEL = "google/gemini-2.5-flash"

/**
 * OpenRouter's server-side free auto-router. Routes each request to a free
 * model (one supporting the requested params, including json_schema), letting
 * OpenRouter pick and fall back among free models on its end. A plain model id,
 * so it flows through the engine unchanged - no client-side rotation needed.
 */
export const OPENROUTER_FREE_MODEL = "openrouter/free"

/** The request never reached OpenRouter (offline, DNS, CORS...). */
export class CompletionNetworkError extends TaggedError(
  "CompletionNetworkError"
)() {}

/** OpenRouter answered with an HTTP error (401 revoked key, 402 credits...). */
export class CompletionRequestFailedError extends TaggedError(
  "CompletionRequestFailed"
)<{ status: number; message?: string }>() {}

/** The response parsed but carried no assistant message. */
export class CompletionEmptyError extends TaggedError("CompletionEmpty")() {}

export type CompletionError =
  | CompletionNetworkError
  | CompletionRequestFailedError
  | CompletionEmptyError

export interface CompletionMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface CompletionRequest {
  /** Bearer token. May be empty for keyless local endpoints (e.g. Ollama). */
  apiKey: string
  /**
   * OpenAI-compatible API root (without the trailing /chat/completions).
   * Defaults to OpenRouter; set to a local provider to override it.
   */
  baseUrl?: string
  model: string
  messages: CompletionMessage[]
  /** JSON schema for structured outputs; omit for free-form text. */
  schema?: { name: string; schema: Record<string, unknown> }
  /**
   * Cap on completion tokens. Important on OpenRouter: without it the model's
   * full max output is reserved against the account's balance up front, which
   * makes turns fail with HTTP 402 on small/free-tier balances even though a
   * turn uses a fraction of that.
   */
  maxTokens?: number
  /**
   * Ordered fallback models. Sent to OpenRouter as `models` (with `model`
   * first), so if the primary errors or is rate-limited it routes to the next
   * one in a single request - used to keep free games going across free-model
   * rate limits.
   */
  fallbackModels?: string[]
}

interface CompletionsResponse {
  choices?: Array<{ message?: { content?: string | null } }>
}

// Transient statuses worth retrying: rate limits (429) and upstream/provider
// hiccups. Free models in particular get rate-limited under back-to-back turns.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 520, 522, 524])
const MAX_ATTEMPTS = 3

// Floor for the affordability retry: never shrink the output cap below this, or
// the model can't return a usable reply (truncated JSON parses as an error).
const MIN_AFFORDABLE_OUTPUT_TOKENS = 1024

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Pulls OpenRouter's human-readable explanation out of an error body. */
const errorMessage = (text: string): string | undefined => {
  if (!text) return undefined
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } }
    return (parsed?.error?.message ?? text)?.slice(0, 300)
  } catch {
    return text.slice(0, 300)
  }
}

/**
 * On a 402, OpenRouter says how many tokens the balance can actually afford,
 * e.g. "you requested up to 6144 tokens, but can only afford 4886". Pull that
 * number out so the call can be retried with a cap the account can cover.
 */
const affordableTokens = (text: string): number | null => {
  const match = /can only afford\s+(\d+)/i.exec(text)
  if (!match) return null
  const tokens = Number(match[1])
  return Number.isFinite(tokens) && tokens > 0 ? tokens : null
}

/** Returns the assistant message content for the given conversation. */
export const requestCompletion = async (
  request: CompletionRequest
): Promise<Result<string, CompletionError>> => {
  // Mutable so an affordability 402 can shrink it and retry within this call.
  let maxTokens = request.maxTokens

  const buildBody = () =>
    JSON.stringify({
      model: request.model,
      messages: request.messages,
      // OpenRouter routes through `models` in order when a model errors/limits.
      // It caps the array at 3 entries, so include the primary plus 2 fallbacks.
      ...(request.fallbackModels?.length && {
        models: [...new Set([request.model, ...request.fallbackModels])].slice(
          0,
          3
        ),
      }),
      ...(maxTokens && { max_tokens: maxTokens }),
      ...(request.schema && {
        response_format: {
          type: "json_schema",
          json_schema: {
            name: request.schema.name,
            strict: true,
            schema: request.schema.schema,
          },
        },
      }),
    })

  const url = completionsUrl(request.baseUrl ?? DEFAULT_BASE_URL)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  // Keyless local endpoints (e.g. Ollama) reject a bare "Bearer "; only send
  // the auth header when there is actually a key to send.
  if (request.apiKey) headers.Authorization = `Bearer ${request.apiKey}`

  let triedAffordabilityRetry = false

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: buildBody(),
      })
    } catch {
      return Result.err(new CompletionNetworkError())
    }

    if (response.ok) {
      let data: CompletionsResponse
      try {
        data = (await response.json()) as CompletionsResponse
      } catch {
        return Result.err(new CompletionNetworkError())
      }
      const content = data.choices?.[0]?.message?.content
      if (!content) return Result.err(new CompletionEmptyError())
      return Result.ok(content)
    }

    // The body can only be read once; capture it for both the affordability
    // check and the eventual error message.
    let text = ""
    try {
      text = await response.text()
    } catch {
      // Leave text empty; fall through to a status-only error.
    }

    // Low balance: OpenRouter reserves the full max_tokens against the account
    // up front and 402s when the cap exceeds what the balance covers, reporting
    // how many it CAN afford. Retry once with that smaller cap so free- and
    // low-balance accounts still complete the call instead of dead-ending.
    if (
      response.status === 402 &&
      !triedAffordabilityRetry &&
      attempt < MAX_ATTEMPTS
    ) {
      const affordable = affordableTokens(text)
      if (
        affordable &&
        affordable >= MIN_AFFORDABLE_OUTPUT_TOKENS &&
        (!maxTokens || affordable < maxTokens)
      ) {
        triedAffordabilityRetry = true
        maxTokens = affordable
        continue
      }
    }

    // Retry transient failures with backoff, honoring Retry-After when given.
    if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(response.headers.get("retry-after"))
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 10_000)
          : 1200 * attempt
      await sleep(waitMs)
      continue
    }

    // Surface OpenRouter's own explanation rather than a bare status code.
    return Result.err(
      new CompletionRequestFailedError({
        status: response.status,
        message: errorMessage(text),
      })
    )
  }

  // Unreachable: the loop always returns, but satisfies the type checker.
  return Result.err(new CompletionRequestFailedError({ status: 429 }))
}
