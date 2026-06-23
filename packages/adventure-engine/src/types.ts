import { z } from "zod"

/**
 * Core domain model for the Open Odyssey engine.
 *
 * An Adventure is an AI-driven choose-your-own-adventure playthrough: the
 * player picks a genre and a premise, names their protagonist, and is dropped
 * into an opening Scene. Each Scene narrates a moment of the story, tracks the
 * protagonist's living state (location, health, inventory, companions, current
 * objective), and offers a handful of choices. Picking a choice - or typing a
 * free-form action - advances the story to the next Scene, which the model
 * generates in reaction to what the player did.
 */

/** The setting templates a player can start an adventure in. */
export const GENRES = [
  "fantasy",
  "scifi",
  "horror",
  "mystery",
  "western",
  "cyberpunk",
  "postapocalyptic",
  "pirate",
] as const

export type Genre = (typeof GENRES)[number]

export const GENRE_LABELS: Record<Genre, string> = {
  fantasy: "High Fantasy",
  scifi: "Space Opera",
  horror: "Gothic Horror",
  mystery: "Noir Mystery",
  western: "Weird West",
  cyberpunk: "Cyberpunk",
  postapocalyptic: "Post-Apocalypse",
  pirate: "Age of Sail",
}

export type AdventureStatus = "active" | "ended"

/**
 * The player's protagonist: a full identity the story is told around. Every
 * field steers how the model writes and what it treats as plausible, so the
 * richer it is the more grounded the adventure. Fields may be blank; the model
 * is told to improvise around whatever is missing.
 */
export interface Character {
  /** The protagonist's name. */
  name: string
  /** How the protagonist is referred to, e.g. "she/her", "they/them". */
  pronouns: string
  /** Free-text age, e.g. "late 30s", "ageless". */
  age: string
  /** Role, class, or profession, e.g. "Disgraced knight", "Void-runner pilot". */
  archetype: string
  /** Short physical description. */
  appearance: string
  /** Temperament and defining traits. */
  personality: string
  /** Backstory and where they stand as the tale opens. */
  background: string
  /** What drives them - the want that pulls the story forward. */
  motivation: string
}

export const EMPTY_CHARACTER: Character = {
  name: "",
  pronouns: "",
  age: "",
  archetype: "",
  appearance: "",
  personality: "",
  background: "",
  motivation: "",
}

/** Whether a character has enough to start (just a name is enough). */
export const isPlayableCharacter = (character: Character): boolean =>
  character.name.trim().length > 0

export interface Adventure {
  id: string
  /** Player-facing title; derived from the protagonist + genre when blank. */
  title: string
  genre: Genre
  /** One-line setup the player wrote, steering tone and premise. */
  premise: string
  /** The protagonist the story is told around. */
  character: Character
  status: AdventureStatus
  /** OpenRouter model id this adventure is played with. */
  model: string
  /**
   * Human language the model writes the story in, as an English language name
   * (e.g. "English", "French"). Set at creation so generated prose matches
   * what the player reads.
   */
  language: string
  /** Real-world timestamps (ms since epoch). */
  createdAt: number
  updatedAt: number
}

export type ChatRole = "system" | "user" | "assistant"

/**
 * One entry in the adventure's conversation log. Every prompt sent to the
 * model and every reply it gives is recorded, so an adventure can be resumed,
 * replayed, or audited.
 */
export interface ChatMessage {
  id: string
  adventureId: string
  role: ChatRole
  content: string
  createdAt: number
}

/**
 * The protagonist's living state, fully re-stated by the model each scene
 * (not a diff), so the latest scene is always a complete snapshot.
 */
export interface StoryState {
  /** Where the protagonist currently is, e.g. "The Drowned Cathedral". */
  location: string
  /** Vitality from 0 (dead) to 100 (unharmed). */
  health: number
  /** Items the protagonist is carrying. */
  inventory: string[]
  /** Named allies travelling with the protagonist. */
  companions: string[]
  /** The protagonist's current goal, in one short line. */
  objective: string
}

export const EMPTY_STATE: StoryState = {
  location: "",
  health: 100,
  inventory: [],
  companions: [],
  objective: "",
}

/** One branch the player can take out of a scene. */
export interface Choice {
  /** Short action label, e.g. "Draw your blade". */
  label: string
  /** One-line tease of what taking it might mean. */
  hint: string
}

/** How an adventure came to a close. */
export const ENDING_KINDS = ["triumph", "tragedy", "twist", "open"] as const

export type EndingKind = (typeof ENDING_KINDS)[number]

/**
 * One beat of the story: the prose, the protagonist's state after it, and the
 * choices leading onward. Scenes are ordered by `index`, oldest first.
 */
export interface Scene {
  id: string
  adventureId: string
  /** 0-based position in the story; 0 is the opening scene. */
  index: number
  /** The action the player took to reach this scene; null for the opening. */
  chosenAction: string | null
  /** The narrated story prose for this beat. */
  narration: string
  /** Onward choices; empty when this scene is an ending. */
  choices: Choice[]
  /** The protagonist's state as of this scene. */
  state: StoryState
  /** True when the story concludes here. */
  isEnding: boolean
  /** How it ended, when it ended. */
  endingKind: EndingKind | null
  createdAt: number
}

/** Scenes sorted oldest-first: the story so far. */
export const toStory = (scenes: Scene[]): Scene[] =>
  [...scenes].sort((a, b) => a.index - b.index)

/**
 * Zod schemas for what the model must return for each scene. Sent to
 * OpenRouter as a strict JSON schema (structured outputs), so fields that may
 * be absent are nullable rather than optional.
 */
export const SceneStateSchema = z.strictObject({
  location: z.string(),
  health: z.number().int().min(0).max(100),
  inventory: z.array(z.string()),
  companions: z.array(z.string()),
  objective: z.string(),
})

export const SceneChoiceSchema = z.strictObject({
  label: z.string(),
  hint: z.string(),
})

export const SceneOutputSchema = z.strictObject({
  /** The story prose for this beat, addressed to the player in 2nd person. */
  narration: z.string(),
  /**
   * 2-4 distinct onward choices. Empty only when `isEnding` is true; the
   * story stops there.
   */
  choices: z.array(SceneChoiceSchema).max(4),
  /** The protagonist's full state after this beat. */
  state: SceneStateSchema,
  /** True when the story reaches a natural conclusion this beat. */
  isEnding: z.boolean(),
  /** How it ended; null unless `isEnding` is true. */
  endingKind: z.enum(ENDING_KINDS).nullable(),
})

export type SceneOutput = z.infer<typeof SceneOutputSchema>

/**
 * What the model must return when generating a character. Sent to OpenRouter
 * as a strict JSON schema; every field is filled (the model invents what the
 * player left open).
 */
export const CharacterSchema = z.strictObject({
  name: z.string(),
  pronouns: z.string(),
  age: z.string(),
  archetype: z.string(),
  appearance: z.string(),
  personality: z.string(),
  background: z.string(),
  motivation: z.string(),
})

export type CharacterOutput = z.infer<typeof CharacterSchema>

/** What Engine.advance returns after a successful scene. */
export interface AdvanceResult {
  adventure: Adventure
  scene: Scene
}
