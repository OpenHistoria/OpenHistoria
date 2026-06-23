import { Result, TaggedError } from "better-result"

import type { Case, ChatMessage, Round } from "@workspace/detective-engine/types"

/** Reading from the underlying storage failed or returned corrupt data. */
export class StoreReadError extends TaggedError("StoreReadError")<{
  key: string
}>() {}

/** Writing to the underlying storage failed (quota, blocked storage...). */
export class StoreWriteError extends TaggedError("StoreWriteError")<{
  key: string
}>() {}

export type CaseStoreError = StoreReadError | StoreWriteError

export type StoreResult<T> = Promise<Result<T, CaseStoreError>>

/**
 * Persistence boundary for the engine. Implementations decide where case state
 * lives; the engine itself never touches storage directly. Methods are async
 * so a server- or IndexedDB-backed store can slot in later without changing
 * the engine.
 */
export interface CaseStore {
  listCases(): StoreResult<Case[]>
  getCase(caseId: string): StoreResult<Case | null>
  saveCase(theCase: Case): StoreResult<void>
  /** Removes the case and everything attached to it. */
  deleteCase(caseId: string): StoreResult<void>

  listMessages(caseId: string): StoreResult<ChatMessage[]>
  appendMessages(caseId: string, messages: ChatMessage[]): StoreResult<void>

  listRounds(caseId: string): StoreResult<Round[]>
  appendRounds(caseId: string, rounds: Round[]): StoreResult<void>

  /**
   * Notifies on any change to stored data (including, where the backend
   * allows it, changes made from other tabs). Returns an unsubscribe
   * function. Designed to back React's useSyncExternalStore.
   */
  subscribe(listener: () => void): () => void
}
