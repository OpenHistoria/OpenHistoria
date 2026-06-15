import { Result, TaggedError } from "better-result"

import type {
  ChatMessage,
  Game,
  GameEvent,
  ScheduledEvent,
} from "@workspace/engine/types"

/** Reading from the underlying storage failed or returned corrupt data. */
export class StoreReadError extends TaggedError("StoreReadError")<{
  key: string
}>() {}

/** Writing to the underlying storage failed (quota, blocked storage...). */
export class StoreWriteError extends TaggedError("StoreWriteError")<{
  key: string
}>() {}

export type GameStoreError = StoreReadError | StoreWriteError

export type StoreResult<T> = Promise<Result<T, GameStoreError>>

/**
 * Persistence boundary for the engine. Implementations decide where game
 * state lives; the engine itself never touches storage directly. Methods are
 * async so server- or IndexedDB-backed stores can slot in later without
 * changing the engine.
 */
export interface GameStore {
  listGames(): StoreResult<Game[]>
  getGame(gameId: string): StoreResult<Game | null>
  saveGame(game: Game): StoreResult<void>
  /** Removes the game and everything attached to it. */
  deleteGame(gameId: string): StoreResult<void>

  listMessages(gameId: string): StoreResult<ChatMessage[]>
  appendMessages(gameId: string, messages: ChatMessage[]): StoreResult<void>

  listEvents(gameId: string): StoreResult<GameEvent[]>
  appendEvents(gameId: string, events: GameEvent[]): StoreResult<void>

  listScheduled(gameId: string): StoreResult<ScheduledEvent[]>
  /** Replaces the full set of pending scheduled events for the game. */
  putScheduled(gameId: string, scheduled: ScheduledEvent[]): StoreResult<void>

  /**
   * Notifies on any change to stored data (including, where the backend
   * allows it, changes made from other tabs). Returns an unsubscribe
   * function. Designed to back React's useSyncExternalStore.
   */
  subscribe(listener: () => void): () => void
}
