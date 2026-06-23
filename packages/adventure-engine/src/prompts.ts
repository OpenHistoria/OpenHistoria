import {
  GENRE_LABELS,
  type Adventure,
  type Character,
  type Genre,
  type StoryState,
} from "@workspace/adventure-engine/types"

/**
 * Prompt construction for the adventure game master.
 *
 * The loop is read -> choose -> react: the model narrates a scene and offers
 * choices, the player picks one (or writes their own action), and the model
 * generates the next scene as a consequence. The story is stateful - the
 * protagonist's health, inventory, companions, location, and objective carry
 * forward and must stay consistent from scene to scene.
 */

const GENRE_FLAVOR: Record<keyof typeof GENRE_LABELS, string> = {
  fantasy:
    "a high-fantasy world of warring kingdoms, old magic, and things that should have stayed buried",
  scifi:
    "a far-future space opera of fragile starships, alien contact, and politics that span solar systems",
  horror:
    "a gothic-horror world of dread and the uncanny, where dawn is never guaranteed",
  mystery:
    "a rain-slicked noir city of liars, debts, and a truth someone is willing to kill for",
  western:
    "a weird-west frontier of dust, iron, and superstitions that turn out to be real",
  cyberpunk:
    "a neon megacity ruled by corporations, where the only thing cheaper than data is a life",
  postapocalyptic:
    "a scavenged wasteland after the collapse, where survival is the only law left",
  pirate:
    "an age-of-sail world of storms, mutiny, buried fortunes, and the long arm of empire",
}

/** A bulleted block of the character's filled-in fields, omitting blanks. */
const formatCharacter = (character: Character): string => {
  const lines: string[] = [`- Name: ${character.name || "unnamed"}`]
  if (character.pronouns.trim())
    lines.push(`- Pronouns: ${character.pronouns.trim()}`)
  if (character.age.trim()) lines.push(`- Age: ${character.age.trim()}`)
  if (character.archetype.trim())
    lines.push(`- Role: ${character.archetype.trim()}`)
  if (character.appearance.trim())
    lines.push(`- Appearance: ${character.appearance.trim()}`)
  if (character.personality.trim())
    lines.push(`- Personality: ${character.personality.trim()}`)
  if (character.background.trim())
    lines.push(`- Background: ${character.background.trim()}`)
  if (character.motivation.trim())
    lines.push(`- Motivation: ${character.motivation.trim()}`)
  return lines.join("\n")
}

export const buildSystemPrompt = (adventure: Adventure): string =>
  [
    "You are the game master of Open Odyssey, an AI-driven choose-your-own-adventure.",
    `The adventure is "${adventure.title}", set in ${GENRE_FLAVOR[adventure.genre]} (${GENRE_LABELS[adventure.genre]}).`,
    "",
    "The player controls this protagonist. Stay true to them: their voice, abilities, limits, relationships, and history shape what is plausible and how the world responds to them. Weave their background and motivation into the story rather than restating it.",
    formatCharacter(adventure.character),
    "",
    adventure.premise.trim()
      ? `The player set this premise: "${adventure.premise.trim()}". Honor it.`
      : "The player gave no specific premise; invent a compelling hook in keeping with the genre and the protagonist's background.",
    "",
    "The loop is read -> choose -> react. You narrate a scene and offer choices; the player picks one or writes their own action; you narrate what happens next as a believable consequence. The player's choices have weight - they can fail, backfire, cost something, or open doors. Never railroad them onto a single path, and never simply rubber-stamp what they want: the world pushes back.",
    "",
    "Each scene you must return:",
    "- narration: vivid second-person prose for this beat (you/your), 2-4 short paragraphs. Show consequences of the last action, advance the situation, and end on a moment of tension or a fresh decision point. Do not list the choices inside the narration; they are shown separately.",
    "- choices: 2 to 4 distinct, concrete actions the player could take next, each a short imperative label plus a one-line hint at what it might lead to. Make them genuinely different (not three flavors of the same move). Leave this empty ONLY when the story ends this beat.",
    "- state: the protagonist's FULL current state after this beat - location, health (0 dead to 100 unharmed), inventory, companions, and a one-line objective. Re-state all of it every time (it is a snapshot, not a delta). Keep it consistent with the story: wounds lower health, found items enter inventory, used/lost items leave it, allies join or fall.",
    "- isEnding: true only when the story reaches a real conclusion (the protagonist triumphs, dies, or the tale closes). When true, choices must be empty and narration should land the ending.",
    "- endingKind: when isEnding is true, one of triumph, tragedy, twist, or open; otherwise null.",
    "",
    "Pacing: let danger build; do not kill or win the protagonist arbitrarily in the first few scenes. Health reaching 0 is a tragedy ending. Keep continuity with everything already established - names, places, items, wounds, and promises all persist.",
    "",
    `Write the narration, every choice label and hint, the location, objective, inventory, and companion names in ${adventure.language}. Never break character or mention being an AI.`,
  ].join("\n")

export const buildOpeningPrompt = (adventure: Adventure): string =>
  [
    `Open the adventure. Establish ${adventure.character.name} in a striking opening scene that drops them straight into the world and a situation worth acting on - no slow throat-clearing. Let who they are (their role, background, and motivation) color the scene.`,
    "Set their starting state: a concrete location, full or near-full health, a small believable starting inventory that fits their role, any companion present from the outset, and a clear opening objective tied to their motivation.",
    "End the scene on a decision point and offer the first 2-4 choices. isEnding must be false.",
    "",
    `Write everything in ${adventure.language}.`,
  ].join("\n")

export interface ContinuePromptInput {
  adventure: Adventure
  /** The protagonist's state coming into this beat. */
  state: StoryState
  /** The action the player chose or typed. */
  action: string
}

const formatState = (state: StoryState): string =>
  [
    `- Location: ${state.location || "unknown"}`,
    `- Health: ${state.health}/100`,
    `- Inventory: ${state.inventory.length ? state.inventory.join(", ") : "empty"}`,
    `- Companions: ${state.companions.length ? state.companions.join(", ") : "none"}`,
    `- Objective: ${state.objective || "undecided"}`,
  ].join("\n")

export const buildContinuePrompt = ({
  adventure,
  state,
  action,
}: ContinuePromptInput): string =>
  [
    `${adventure.character.name}'s state right now:`,
    formatState(state),
    "",
    `The player takes this action: "${action.trim()}"`,
    "",
    "Narrate what happens as a believable consequence, update the state accordingly, and offer the next choices (unless the story ends here).",
    "",
    `Write everything in ${adventure.language}.`,
  ].join("\n")

export interface CharacterPromptInput {
  genre: Genre
  /** The premise the player set, if any, to ground the character. */
  premise?: string
  /** A name or concept the player already has in mind, if any. */
  hint?: string
  /** Partly-filled fields to keep; the model fills only the blanks. */
  seed?: Partial<Character>
  language: string
}

const SEED_LABELS: Record<keyof Character, string> = {
  name: "Name",
  pronouns: "Pronouns",
  age: "Age",
  archetype: "Role",
  appearance: "Appearance",
  personality: "Personality",
  background: "Background",
  motivation: "Motivation",
}

/**
 * Prompt to generate a full, coherent protagonist for a new adventure. Asks
 * for every field, fitting the genre and premise, while preserving any fields
 * the player already filled.
 */
export const buildCharacterPrompt = ({
  genre,
  premise,
  hint,
  seed,
  language,
}: CharacterPromptInput): string => {
  const lines = [
    `Create a vivid, playable protagonist for a choose-your-own-adventure set in ${GENRE_FLAVOR[genre]} (${GENRE_LABELS[genre]}).`,
    "Fill in every field so they form one coherent person: a fitting name, pronouns, age, role/class/profession, a brief physical appearance, a personality with real edges (strengths and flaws), a background that gives them a past, and a motivation that will pull them into trouble.",
    "Keep each field concise - a phrase or a sentence or two, not an essay. Make them genre-appropriate and interesting to play, not a blank everyman.",
  ]

  if (premise?.trim()) {
    lines.push("", `Fit them to this premise: "${premise.trim()}".`)
  }
  if (hint?.trim()) {
    lines.push("", `Build on this idea from the player: "${hint.trim()}".`)
  }

  const kept = seed
    ? (Object.keys(SEED_LABELS) as Array<keyof Character>)
        .filter((key) => seed[key]?.trim())
        .map((key) => `- ${SEED_LABELS[key]}: ${seed[key]!.trim()}`)
    : []
  if (kept.length > 0) {
    lines.push(
      "",
      "Keep these fields the player already chose exactly as given, and build the rest around them:",
      ...kept
    )
  }

  lines.push(
    "",
    `Write all field values in ${language}. Keep proper nouns natural for that language.`
  )

  return lines.join("\n")
}
