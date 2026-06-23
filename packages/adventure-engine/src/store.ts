import { Result, TaggedError } from "better-result"

import type {
  Adventure,
  ChatMessage,
  Scene,
} from "@workspace/adventure-engine/types"

/** Reading from the underlying storage failed or returned corrupt data. */
export class StoreReadError extends TaggedError("StoreReadError")<{
  key: string
}>() {}

/** Writing to the underlying storage failed (quota, blocked storage...). */
export class StoreWriteError extends TaggedError("StoreWriteError")<{
  key: string
}>() {}

export type AdventureStoreError = StoreReadError | StoreWriteError

export type StoreResult<T> = Promise<Result<T, AdventureStoreError>>

/**
 * Persistence boundary for the engine. Implementations decide where adventure
 * state lives; the engine itself never touches storage directly. Methods are
 * async so a server- or IndexedDB-backed store can slot in later without
 * changing the engine.
 */
export interface AdventureStore {
  listAdventures(): StoreResult<Adventure[]>
  getAdventure(adventureId: string): StoreResult<Adventure | null>
  saveAdventure(adventure: Adventure): StoreResult<void>
  /** Removes the adventure and everything attached to it. */
  deleteAdventure(adventureId: string): StoreResult<void>

  listMessages(adventureId: string): StoreResult<ChatMessage[]>
  appendMessages(
    adventureId: string,
    messages: ChatMessage[]
  ): StoreResult<void>

  listScenes(adventureId: string): StoreResult<Scene[]>
  appendScenes(adventureId: string, scenes: Scene[]): StoreResult<void>

  /**
   * Notifies on any change to stored data (including, where the backend
   * allows it, changes made from other tabs). Returns an unsubscribe
   * function. Designed to back React's useSyncExternalStore.
   */
  subscribe(listener: () => void): () => void
}
