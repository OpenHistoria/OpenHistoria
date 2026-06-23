import type {
  AccuseError,
  AdvanceError,
  CreateCaseError,
} from "@workspace/detective-engine"

import type { OpenRouterError } from "@/lib/openrouter"

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

const formatCompletionError = (
  error: Extract<
    AdvanceError,
    { _tag: "CompletionNetworkError" | "CompletionRequestFailed" | "CompletionEmpty" }
  >
): string => {
  switch (error._tag) {
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

/** Human-readable message for an error advancing the investigation. */
export const formatAdvanceError = (error: AdvanceError): string => {
  switch (error._tag) {
    case "CaseNotFound":
      return "This case could not be found."
    case "CaseClosed":
      return "This case is already closed."
    case "MissingApiKey":
      return "Connect your OpenRouter account to investigate."
    case "InvalidRoundOutput":
      return "The trail went cold for a moment. Try again."
    case "StoreReadError":
    case "StoreWriteError":
      return "Could not save your progress. Your browser storage may be full or blocked."
    default:
      return formatCompletionError(error)
  }
}

/** Human-readable message for an error resolving an accusation. */
export const formatAccuseError = (error: AccuseError): string => {
  switch (error._tag) {
    case "CaseNotFound":
      return "This case could not be found."
    case "CaseClosed":
      return "This case is already closed."
    case "MissingApiKey":
      return "Connect your OpenRouter account to make an accusation."
    case "StoreReadError":
    case "StoreWriteError":
      return "Could not save the verdict. Your browser storage may be full or blocked."
    default:
      return formatCompletionError(error)
  }
}

/** Human-readable message for an error opening a new case. */
export const formatCreateCaseError = (error: CreateCaseError): string => {
  switch (error._tag) {
    case "MissingApiKey":
      return "Connect your OpenRouter account to open a case."
    case "InvalidCaseFileOutput":
      return "The case file came back garbled. Try opening it again."
    case "StoreReadError":
    case "StoreWriteError":
      return "Could not save the case. Your browser storage may be full or blocked."
    default:
      return formatCompletionError(error)
  }
}
