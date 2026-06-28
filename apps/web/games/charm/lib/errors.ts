import type {
  AdvanceError,
  GenerateInterestError,
} from "@workspace/seduction-engine"

import type { OpenRouterError } from "@/games/charm/lib/openrouter"

/** Human-readable message for an OpenRouter auth / key error. */
export const formatOpenRouterError = (error: OpenRouterError): string => {
  switch (error._tag) {
    case "OpenRouterAuthExpired":
      return "Your sign-in session expired before it finished. Try connecting again."
    case "OpenRouterExchangeFailed":
      return `OpenRouter could not complete the sign-in (HTTP ${error.status}). Try again.`
    case "OpenRouterNoKeyReturned":
      return "OpenRouter did not return a key. Try connecting again."
    case "OpenRouterNetworkError":
      return "Could not reach OpenRouter. Check your connection and try again."
    case "OpenRouterRequestFailed":
      return `OpenRouter returned an error (HTTP ${error.status}).`
  }
}

/** Human-readable message for an error advancing the encounter. */
export const formatAdvanceError = (error: AdvanceError): string => {
  switch (error._tag) {
    case "FlirtationNotFound":
      return "This encounter could not be found."
    case "FlirtationEnded":
      return "This encounter has already run its course."
    case "MissingApiKey":
      return "Connect your OpenRouter account to play."
    case "InvalidBeatOutput":
      return "They lost their train of thought. Try again."
    case "CompletionNetworkError":
      return "Could not reach the model. Check your connection and try again."
    case "CompletionRequestFailed":
      return error.message
        ? `The model returned an error: ${error.message}`
        : `The model returned an error (HTTP ${error.status}).`
    case "CompletionEmpty":
      return "The model returned an empty reply. Try again."
    case "StoreReadError":
    case "StoreWriteError":
      return "Could not save your progress. Your browser storage may be full or blocked."
  }
}

/** Human-readable message for an error generating a love interest. */
export const formatGenerateInterestError = (
  error: GenerateInterestError
): string => {
  switch (error._tag) {
    case "MissingApiKey":
      return "Connect your OpenRouter account to dream someone up."
    case "InvalidInterestOutput":
      return "The matchmaker faltered. Try generating again."
    case "CompletionNetworkError":
      return "Could not reach the model. Check your connection and try again."
    case "CompletionRequestFailed":
      return error.message
        ? `The model returned an error: ${error.message}`
        : `The model returned an error (HTTP ${error.status}).`
    case "CompletionEmpty":
      return "The model returned an empty reply. Try again."
  }
}
