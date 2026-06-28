import { Result } from "better-result"

import {
  StoreReadError,
  StoreWriteError,
  type FlirtationStore,
  type StoreResult,
} from "@workspace/seduction-engine/store"
import type {
  Beat,
  ChatMessage,
  Flirtation,
} from "@workspace/seduction-engine/types"

const PREFIX = "openhistoria:charm-engine"

/** Fired on window whenever this tab writes to the store. */
export const ENGINE_STORE_CHANGED_EVENT = "openhistoria:charm-store-changed"

const indexKey = () => `${PREFIX}:flirtations`
const flirtationKey = (id: string) => `${PREFIX}:flirtation:${id}`
const messagesKey = (id: string) => `${PREFIX}:messages:${id}`
const beatsKey = (id: string) => `${PREFIX}:beats:${id}`

/**
 * FlirtationStore backed by window.localStorage. The default store:
 * flirtations live in the player's browser only, mirroring how the OpenRouter
 * key is kept client-side. Layout: an index of flirtation ids plus one key per
 * flirtation for its record, message log, and beats.
 */
export class LocalStorageFlirtationStore implements FlirtationStore {
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

  async listFlirtations(): StoreResult<Flirtation[]> {
    const ids = this.readList<string>(indexKey())
    if (ids.isErr()) return Result.err(ids.error)
    const flirtations: Flirtation[] = []
    for (const id of ids.value) {
      const flirtation = this.read<Flirtation>(flirtationKey(id))
      if (flirtation.isErr()) return Result.err(flirtation.error)
      if (flirtation.value) flirtations.push(flirtation.value)
    }
    return Result.ok(flirtations)
  }

  async getFlirtation(flirtationId: string): StoreResult<Flirtation | null> {
    return this.read<Flirtation>(flirtationKey(flirtationId))
  }

  async saveFlirtation(flirtation: Flirtation): StoreResult<void> {
    const ids = this.readList<string>(indexKey())
    if (ids.isErr()) return Result.err(ids.error)
    if (!ids.value.includes(flirtation.id)) {
      const indexed = this.write(indexKey(), [...ids.value, flirtation.id])
      if (indexed.isErr()) return indexed
    }
    return this.write(flirtationKey(flirtation.id), flirtation)
  }

  async deleteFlirtation(flirtationId: string): StoreResult<void> {
    const ids = this.readList<string>(indexKey())
    if (ids.isErr()) return Result.err(ids.error)
    const reindexed = this.write(
      indexKey(),
      ids.value.filter((id) => id !== flirtationId)
    )
    if (reindexed.isErr()) return reindexed
    return Result.try({
      try: () => {
        for (const key of [
          flirtationKey(flirtationId),
          messagesKey(flirtationId),
          beatsKey(flirtationId),
        ]) {
          window.localStorage.removeItem(key)
        }
        window.dispatchEvent(new Event(ENGINE_STORE_CHANGED_EVENT))
      },
      catch: () => new StoreWriteError({ key: flirtationKey(flirtationId) }),
    })
  }

  async listMessages(flirtationId: string): StoreResult<ChatMessage[]> {
    return this.readList<ChatMessage>(messagesKey(flirtationId))
  }

  async appendMessages(
    flirtationId: string,
    messages: ChatMessage[]
  ): StoreResult<void> {
    return this.appendTo(messagesKey(flirtationId), messages)
  }

  async listBeats(flirtationId: string): StoreResult<Beat[]> {
    return this.readList<Beat>(beatsKey(flirtationId))
  }

  async appendBeats(flirtationId: string, beats: Beat[]): StoreResult<void> {
    return this.appendTo(beatsKey(flirtationId), beats)
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
