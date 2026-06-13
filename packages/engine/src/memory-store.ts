import { Result } from "better-result"

import type { GameStore, StoreResult } from "@workspace/engine/store"
import type {
  ChatMessage,
  Game,
  GameEvent,
  ScheduledEvent,
} from "@workspace/engine/types"

/**
 * In-memory GameStore. Nothing survives a reload; useful for tests, SSR,
 * and prototyping. All operations are infallible.
 */
export class MemoryGameStore implements GameStore {
  private games = new Map<string, Game>()
  private messages = new Map<string, ChatMessage[]>()
  private events = new Map<string, GameEvent[]>()
  private scheduled = new Map<string, ScheduledEvent[]>()
  private listeners = new Set<() => void>()

  private notify() {
    for (const listener of this.listeners) listener()
  }

  async listGames(): StoreResult<Game[]> {
    return Result.ok([...this.games.values()])
  }

  async getGame(gameId: string): StoreResult<Game | null> {
    return Result.ok(this.games.get(gameId) ?? null)
  }

  async saveGame(game: Game): StoreResult<void> {
    this.games.set(game.id, game)
    this.notify()
    return Result.ok(undefined)
  }

  async deleteGame(gameId: string): StoreResult<void> {
    this.games.delete(gameId)
    this.messages.delete(gameId)
    this.events.delete(gameId)
    this.scheduled.delete(gameId)
    this.notify()
    return Result.ok(undefined)
  }

  async listMessages(gameId: string): StoreResult<ChatMessage[]> {
    return Result.ok(this.messages.get(gameId) ?? [])
  }

  async appendMessages(
    gameId: string,
    messages: ChatMessage[]
  ): StoreResult<void> {
    this.messages.set(gameId, [
      ...(this.messages.get(gameId) ?? []),
      ...messages,
    ])
    this.notify()
    return Result.ok(undefined)
  }

  async listEvents(gameId: string): StoreResult<GameEvent[]> {
    return Result.ok(this.events.get(gameId) ?? [])
  }

  async appendEvents(gameId: string, events: GameEvent[]): StoreResult<void> {
    this.events.set(gameId, [...(this.events.get(gameId) ?? []), ...events])
    this.notify()
    return Result.ok(undefined)
  }

  async listScheduled(gameId: string): StoreResult<ScheduledEvent[]> {
    return Result.ok(this.scheduled.get(gameId) ?? [])
  }

  async putScheduled(
    gameId: string,
    scheduled: ScheduledEvent[]
  ): StoreResult<void> {
    this.scheduled.set(gameId, scheduled)
    this.notify()
    return Result.ok(undefined)
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}
