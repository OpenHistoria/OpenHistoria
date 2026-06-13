import { Result } from "better-result"

import {
  StoreReadError,
  StoreWriteError,
  type GameStore,
  type StoreResult,
} from "@workspace/engine/store"
import type {
  ChatMessage,
  Game,
  GameEvent,
  ScheduledEvent,
} from "@workspace/engine/types"

const PREFIX = "openhistoria:engine"

/** Fired on window whenever this tab writes to the store. */
export const ENGINE_STORE_CHANGED_EVENT = "openhistoria:engine-store-changed"

const indexKey = () => `${PREFIX}:games`
const gameKey = (gameId: string) => `${PREFIX}:game:${gameId}`
const messagesKey = (gameId: string) => `${PREFIX}:messages:${gameId}`
const eventsKey = (gameId: string) => `${PREFIX}:events:${gameId}`
const scheduledKey = (gameId: string) => `${PREFIX}:scheduled:${gameId}`

/**
 * GameStore backed by window.localStorage. The default store for now: games
 * live in the player's browser only, mirroring how the OpenRouter key is
 * kept client-side. Layout: an index of game ids plus one key per game for
 * its record, message log, events, and scheduled events.
 */
export class LocalStorageGameStore implements GameStore {
  private read<T>(key: string): Result<T | null, StoreReadError> {
    // The cast bridges Result.try's Awaited<T> with the bare generic; the
    // thunk is synchronous so the two are the same type at runtime.
    return Result.try({
      try: () => {
        const raw = window.localStorage.getItem(key)
        return raw === null ? null : (JSON.parse(raw) as unknown)
      },
      catch: () => new StoreReadError({ key }),
    }) as Result<T | null, StoreReadError>
  }

  private write(key: string, value: unknown): Result<void, StoreWriteError> {
    return Result.try({
      try: () => {
        window.localStorage.setItem(key, JSON.stringify(value))
        window.dispatchEvent(new Event(ENGINE_STORE_CHANGED_EVENT))
      },
      catch: () => new StoreWriteError({ key }),
    })
  }

  private readList<T>(key: string): Result<T[], StoreReadError> {
    return this.read<T[]>(key).map((list) => list ?? [])
  }

  private appendTo<T>(
    key: string,
    items: T[]
  ): Result<void, StoreReadError | StoreWriteError> {
    return this.readList<T>(key).andThen((existing) =>
      this.write(key, [...existing, ...items])
    )
  }

  async listGames(): StoreResult<Game[]> {
    const ids = this.readList<string>(indexKey())
    if (ids.isErr()) return Result.err(ids.error)
    const games: Game[] = []
    for (const id of ids.value) {
      const game = this.read<Game>(gameKey(id))
      if (game.isErr()) return Result.err(game.error)
      if (game.value) games.push(game.value)
    }
    return Result.ok(games)
  }

  async getGame(gameId: string): StoreResult<Game | null> {
    return this.read<Game>(gameKey(gameId))
  }

  async saveGame(game: Game): StoreResult<void> {
    const ids = this.readList<string>(indexKey())
    if (ids.isErr()) return Result.err(ids.error)
    if (!ids.value.includes(game.id)) {
      const indexed = this.write(indexKey(), [...ids.value, game.id])
      if (indexed.isErr()) return indexed
    }
    return this.write(gameKey(game.id), game)
  }

  async deleteGame(gameId: string): StoreResult<void> {
    const ids = this.readList<string>(indexKey())
    if (ids.isErr()) return Result.err(ids.error)
    const reindexed = this.write(
      indexKey(),
      ids.value.filter((id) => id !== gameId)
    )
    if (reindexed.isErr()) return reindexed
    return Result.try({
      try: () => {
        for (const key of [
          gameKey(gameId),
          messagesKey(gameId),
          eventsKey(gameId),
          scheduledKey(gameId),
        ]) {
          window.localStorage.removeItem(key)
        }
        window.dispatchEvent(new Event(ENGINE_STORE_CHANGED_EVENT))
      },
      catch: () => new StoreWriteError({ key: gameKey(gameId) }),
    })
  }

  async listMessages(gameId: string): StoreResult<ChatMessage[]> {
    return this.readList<ChatMessage>(messagesKey(gameId))
  }

  async appendMessages(
    gameId: string,
    messages: ChatMessage[]
  ): StoreResult<void> {
    return this.appendTo(messagesKey(gameId), messages)
  }

  async listEvents(gameId: string): StoreResult<GameEvent[]> {
    return this.readList<GameEvent>(eventsKey(gameId))
  }

  async appendEvents(gameId: string, events: GameEvent[]): StoreResult<void> {
    return this.appendTo(eventsKey(gameId), events)
  }

  async listScheduled(gameId: string): StoreResult<ScheduledEvent[]> {
    return this.readList<ScheduledEvent>(scheduledKey(gameId))
  }

  async putScheduled(
    gameId: string,
    scheduled: ScheduledEvent[]
  ): StoreResult<void> {
    return this.write(scheduledKey(gameId), scheduled)
  }

  subscribe(listener: () => void): () => void {
    window.addEventListener(ENGINE_STORE_CHANGED_EVENT, listener)
    // Picks up writes from other tabs.
    window.addEventListener("storage", listener)
    return () => {
      window.removeEventListener(ENGINE_STORE_CHANGED_EVENT, listener)
      window.removeEventListener("storage", listener)
    }
  }
}
