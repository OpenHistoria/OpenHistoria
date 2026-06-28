import { Result } from "better-result"

import type {
  FlirtationStore,
  StoreResult,
} from "@workspace/seduction-engine/store"
import type {
  Beat,
  ChatMessage,
  Flirtation,
} from "@workspace/seduction-engine/types"

/**
 * In-memory FlirtationStore. Nothing survives a reload; useful for tests, SSR,
 * and prototyping. All operations are infallible.
 */
export class MemoryFlirtationStore implements FlirtationStore {
  private flirtations = new Map<string, Flirtation>()
  private messages = new Map<string, ChatMessage[]>()
  private beats = new Map<string, Beat[]>()
  private listeners = new Set<() => void>()

  private notify() {
    for (const listener of this.listeners) listener()
  }

  async listFlirtations(): StoreResult<Flirtation[]> {
    return Result.ok([...this.flirtations.values()])
  }

  async getFlirtation(flirtationId: string): StoreResult<Flirtation | null> {
    return Result.ok(this.flirtations.get(flirtationId) ?? null)
  }

  async saveFlirtation(flirtation: Flirtation): StoreResult<void> {
    this.flirtations.set(flirtation.id, flirtation)
    this.notify()
    return Result.ok(undefined)
  }

  async deleteFlirtation(flirtationId: string): StoreResult<void> {
    this.flirtations.delete(flirtationId)
    this.messages.delete(flirtationId)
    this.beats.delete(flirtationId)
    this.notify()
    return Result.ok(undefined)
  }

  async listMessages(flirtationId: string): StoreResult<ChatMessage[]> {
    return Result.ok(this.messages.get(flirtationId) ?? [])
  }

  async appendMessages(
    flirtationId: string,
    messages: ChatMessage[]
  ): StoreResult<void> {
    this.messages.set(flirtationId, [
      ...(this.messages.get(flirtationId) ?? []),
      ...messages,
    ])
    this.notify()
    return Result.ok(undefined)
  }

  async listBeats(flirtationId: string): StoreResult<Beat[]> {
    return Result.ok(this.beats.get(flirtationId) ?? [])
  }

  async appendBeats(flirtationId: string, beats: Beat[]): StoreResult<void> {
    this.beats.set(flirtationId, [
      ...(this.beats.get(flirtationId) ?? []),
      ...beats,
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
