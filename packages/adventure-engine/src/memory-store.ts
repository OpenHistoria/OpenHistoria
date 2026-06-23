import { Result } from "better-result"

import type { AdventureStore, StoreResult } from "@workspace/adventure-engine/store"
import type {
  Adventure,
  ChatMessage,
  Scene,
} from "@workspace/adventure-engine/types"

/**
 * In-memory AdventureStore. Nothing survives a reload; useful for tests, SSR,
 * and prototyping. All operations are infallible.
 */
export class MemoryAdventureStore implements AdventureStore {
  private adventures = new Map<string, Adventure>()
  private messages = new Map<string, ChatMessage[]>()
  private scenes = new Map<string, Scene[]>()
  private listeners = new Set<() => void>()

  private notify() {
    for (const listener of this.listeners) listener()
  }

  async listAdventures(): StoreResult<Adventure[]> {
    return Result.ok([...this.adventures.values()])
  }

  async getAdventure(adventureId: string): StoreResult<Adventure | null> {
    return Result.ok(this.adventures.get(adventureId) ?? null)
  }

  async saveAdventure(adventure: Adventure): StoreResult<void> {
    this.adventures.set(adventure.id, adventure)
    this.notify()
    return Result.ok(undefined)
  }

  async deleteAdventure(adventureId: string): StoreResult<void> {
    this.adventures.delete(adventureId)
    this.messages.delete(adventureId)
    this.scenes.delete(adventureId)
    this.notify()
    return Result.ok(undefined)
  }

  async listMessages(adventureId: string): StoreResult<ChatMessage[]> {
    return Result.ok(this.messages.get(adventureId) ?? [])
  }

  async appendMessages(
    adventureId: string,
    messages: ChatMessage[]
  ): StoreResult<void> {
    this.messages.set(adventureId, [
      ...(this.messages.get(adventureId) ?? []),
      ...messages,
    ])
    this.notify()
    return Result.ok(undefined)
  }

  async listScenes(adventureId: string): StoreResult<Scene[]> {
    return Result.ok(this.scenes.get(adventureId) ?? [])
  }

  async appendScenes(adventureId: string, scenes: Scene[]): StoreResult<void> {
    this.scenes.set(adventureId, [
      ...(this.scenes.get(adventureId) ?? []),
      ...scenes,
    ])
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
