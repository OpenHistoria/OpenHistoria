import type {
  AdvanceError,
  GenerateCharacterError,
} from "@workspace/adventure-engine"

import type { OpenRouterError } from "@/games/odyssey/lib/openrouter"

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

/** Human-readable message for an error advancing the story. */
export const formatAdvanceError = (error: AdvanceError): string => {
  switch (error._tag) {
    case "AdventureNotFound":
      return "This adventure could not be found."
    case "AdventureEnded":
      return "This adventure has already reached its end."
    case "MissingApiKey":
      return "Connect your OpenRouter account to play."
    case "InvalidSceneOutput":
      return "The storyteller lost the thread. Try again."
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

/** Human-readable message for an error generating a character. */
export const formatGenerateCharacterError = (
  error: GenerateCharacterError
): string => {
  switch (error._tag) {
    case "MissingApiKey":
      return "Connect your OpenRouter account to generate a character."
    case "InvalidCharacterOutput":
      return "The muse faltered. Try generating again."
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
