import { Result, TaggedError } from "better-result"

/**
 * Minimal OpenRouter chat-completions client. The app already handles the
 * PKCE flow and key storage (apps/web/lib/openrouter.ts); this module only
 * spends the resulting key. Structured outputs (json_schema) are used so
 * turn results come back as validated JSON instead of free text.
 */

const COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions"

/** Reasonable default; games can override via EngineConfig.model. */
export const DEFAULT_MODEL = "google/gemini-2.5-flash"

/** The request never reached OpenRouter (offline, DNS, CORS...). */
export class CompletionNetworkError extends TaggedError(
  "CompletionNetworkError"
)() {}

/** OpenRouter answered with an HTTP error (401 revoked key, 402 credits...). */
export class CompletionRequestFailedError extends TaggedError(
  "CompletionRequestFailed"
)<{ status: number }>() {}

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
  apiKey: string
  model: string
  messages: CompletionMessage[]
  /** JSON schema for structured outputs; omit for free-form text. */
  schema?: { name: string; schema: Record<string, unknown> }
}

interface CompletionsResponse {
  choices?: Array<{ message?: { content?: string | null } }>
}

/** Returns the assistant message content for the given conversation. */
export const requestCompletion = (
  request: CompletionRequest
): Promise<Result<string, CompletionError>> =>
  Result.gen(async function* () {
    const response = yield* Result.await(
      Result.tryPromise({
        try: () =>
          fetch(COMPLETIONS_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${request.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: request.model,
              messages: request.messages,
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
            }),
          }),
        catch: () => new CompletionNetworkError(),
      })
    )
    if (!response.ok) {
      return Result.err(
        new CompletionRequestFailedError({ status: response.status })
      )
    }

    const data = yield* Result.await(
      Result.tryPromise({
        try: () => response.json() as Promise<CompletionsResponse>,
        catch: () => new CompletionNetworkError(),
      })
    )
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return Result.err(new CompletionEmptyError())
    }
    return Result.ok(content)
  })
