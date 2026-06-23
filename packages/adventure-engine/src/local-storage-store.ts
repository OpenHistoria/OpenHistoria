import { Result } from "better-result"

import {
  StoreReadError,
  StoreWriteError,
  type AdventureStore,
  type StoreResult,
} from "@workspace/adventure-engine/store"
import type {
  Adventure,
  ChatMessage,
  Scene,
} from "@workspace/adventure-engine/types"

const PREFIX = "openodyssey:engine"

/** Fired on window whenever this tab writes to the store. */
export const ENGINE_STORE_CHANGED_EVENT = "openodyssey:engine-store-changed"

const indexKey = () => `${PREFIX}:adventures`
const adventureKey = (id: string) => `${PREFIX}:adventure:${id}`
const messagesKey = (id: string) => `${PREFIX}:messages:${id}`
const scenesKey = (id: string) => `${PREFIX}:scenes:${id}`

/**
 * AdventureStore backed by window.localStorage. The default store: adventures
 * live in the player's browser only, mirroring how the OpenRouter key is kept
 * client-side. Layout: an index of adventure ids plus one key per adventure
 * for its record, message log, and scenes.
 */
export class LocalStorageAdventureStore implements AdventureStore {
  private read<T>(key: string): Result<T | null, StoreReadError> {
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

  async listAdventures(): StoreResult<Adventure[]> {
    const ids = this.readList<string>(indexKey())
    if (ids.isErr()) return Result.err(ids.error)
    const adventures: Adventure[] = []
    for (const id of ids.value) {
      const adventure = this.read<Adventure>(adventureKey(id))
      if (adventure.isErr()) return Result.err(adventure.error)
      if (adventure.value) adventures.push(adventure.value)
    }
    return Result.ok(adventures)
  }

  async getAdventure(adventureId: string): StoreResult<Adventure | null> {
    return this.read<Adventure>(adventureKey(adventureId))
  }

  async saveAdventure(adventure: Adventure): StoreResult<void> {
    const ids = this.readList<string>(indexKey())
    if (ids.isErr()) return Result.err(ids.error)
    if (!ids.value.includes(adventure.id)) {
      const indexed = this.write(indexKey(), [...ids.value, adventure.id])
      if (indexed.isErr()) return indexed
    }
    return this.write(adventureKey(adventure.id), adventure)
  }

  async deleteAdventure(adventureId: string): StoreResult<void> {
    const ids = this.readList<string>(indexKey())
    if (ids.isErr()) return Result.err(ids.error)
    const reindexed = this.write(
      indexKey(),
      ids.value.filter((id) => id !== adventureId)
    )
    if (reindexed.isErr()) return reindexed
    return Result.try({
      try: () => {
        for (const key of [
          adventureKey(adventureId),
          messagesKey(adventureId),
          scenesKey(adventureId),
        ]) {
          window.localStorage.removeItem(key)
        }
        window.dispatchEvent(new Event(ENGINE_STORE_CHANGED_EVENT))
      },
      catch: () => new StoreWriteError({ key: adventureKey(adventureId) }),
    })
  }

  async listMessages(adventureId: string): StoreResult<ChatMessage[]> {
    return this.readList<ChatMessage>(messagesKey(adventureId))
  }

  async appendMessages(
    adventureId: string,
    messages: ChatMessage[]
  ): StoreResult<void> {
    return this.appendTo(messagesKey(adventureId), messages)
  }

  async listScenes(adventureId: string): StoreResult<Scene[]> {
    return this.readList<Scene>(scenesKey(adventureId))
  }

  async appendScenes(adventureId: string, scenes: Scene[]): StoreResult<void> {
    return this.appendTo(scenesKey(adventureId), scenes)
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
