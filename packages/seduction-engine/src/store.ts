import { Result, TaggedError } from "better-result"

import type {
  Beat,
  ChatMessage,
  Flirtation,
} from "@workspace/seduction-engine/types"

/** Reading from the underlying storage failed or returned corrupt data. */
export class StoreReadError extends TaggedError("StoreReadError")<{
  key: string
}>() {}

/** Writing to the underlying storage failed (quota, blocked storage...). */
export class StoreWriteError extends TaggedError("StoreWriteError")<{
  key: string
}>() {}

export type FlirtationStoreError = StoreReadError | StoreWriteError

export type StoreResult<T> = Promise<Result<T, FlirtationStoreError>>

/**
 * Persistence boundary for the engine. Implementations decide where flirtation
 * state lives; the engine itself never touches storage directly. Methods are
 * async so a server- or IndexedDB-backed store can slot in later without
 * changing the engine.
 */
export interface FlirtationStore {
  listFlirtations(): StoreResult<Flirtation[]>
  getFlirtation(flirtationId: string): StoreResult<Flirtation | null>
  saveFlirtation(flirtation: Flirtation): StoreResult<void>
  /** Removes the flirtation and everything attached to it. */
  deleteFlirtation(flirtationId: string): StoreResult<void>

  listMessages(flirtationId: string): StoreResult<ChatMessage[]>
  appendMessages(
    flirtationId: string,
    messages: ChatMessage[]
  ): StoreResult<void>

  listBeats(flirtationId: string): StoreResult<Beat[]>
  appendBeats(flirtationId: string, beats: Beat[]): StoreResult<void>

  /**
   * Notifies on any change to stored data (including, where the backend
   * allows it, changes made from other tabs). Returns an unsubscribe
   * function. Designed to back React's useSyncExternalStore.
   */
  subscribe(listener: () => void): () => void
}
