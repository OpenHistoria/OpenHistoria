import {
  SCENARIO_LABELS,
  type Flirtation,
  type LoveInterest,
  type MoodState,
  type Scenario,
} from "@workspace/seduction-engine/types"

/**
 * Prompt construction for the romance game master.
 *
 * The loop is read -> say -> react: the model narrates a beat and offers moves
 * (lines or gestures), the player picks one (or writes their own), and the
 * model writes the next beat as the love interest's believable reaction. The
 * encounter is stateful - attraction, mood, the chemistry built and the
 * missteps made carry forward and must stay consistent beat to beat.
 *
 * House rules baked into every system prompt: keep it tasteful (warm, witty,
 * PG-13, fade-to-black at most), treat the love interest as a real adult with
 * agency who is never coerced, and make charm something the player earns
 * through wit and attention rather than something they're simply handed.
 */

const SCENARIO_FLAVOR: Record<keyof typeof SCENARIO_LABELS, string> = {
  "cocktail-bar":
    "a low-lit cocktail bar humming with conversation, where a good line carries over the music",
  bookshop:
    "a secondhand bookshop minutes from closing, all narrow aisles, lamplight, and the smell of old paper",
  masquerade:
    "a candlelit masquerade ball where everyone is half-hidden behind a mask and no one uses their real name",
  coffeehouse:
    "a busy corner coffeehouse on a grey afternoon, the only free seat at a shared table",
  "art-gallery":
    "a gallery opening thick with wine and pretension, the art a convenient excuse to talk",
  "rooftop-party":
    "a rooftop party at golden hour, city lights coming up, the crowd thinning toward the edges",
  "night-train":
    "an overnight train rocking through the dark, two strangers sharing a carriage and nowhere to be until morning",
  wedding:
    "a stranger's wedding reception where you've been seated together and the dancing has started",
}

/** A bulleted block of the love interest's filled-in fields, omitting blanks. */
const formatInterest = (interest: LoveInterest): string => {
  const lines: string[] = [`- Name: ${interest.name || "unnamed"}`]
  if (interest.pronouns.trim())
    lines.push(`- Pronouns: ${interest.pronouns.trim()}`)
  if (interest.age.trim()) lines.push(`- Age: ${interest.age.trim()} (an adult)`)
  if (interest.vibe.trim()) lines.push(`- Vibe: ${interest.vibe.trim()}`)
  if (interest.appearance.trim())
    lines.push(`- Appearance: ${interest.appearance.trim()}`)
  if (interest.personality.trim())
    lines.push(`- Personality: ${interest.personality.trim()}`)
  if (interest.background.trim())
    lines.push(`- Background: ${interest.background.trim()}`)
  if (interest.lookingFor.trim())
    lines.push(`- Looking for: ${interest.lookingFor.trim()}`)
  return lines.join("\n")
}

export const buildSystemPrompt = (flirtation: Flirtation): string =>
  [
    "You are the game master of Open Charm, an AI-driven romance game about winning someone over through conversation.",
    `The encounter is "${flirtation.title}", set in ${SCENARIO_FLAVOR[flirtation.scenario]} (${SCENARIO_LABELS[flirtation.scenario]}).`,
    "",
    "You play one character: the person the player is trying to charm. Voice them fully and consistently - their wit, their guardedness, their tastes and turn-offs, their history. They are a real adult with their own agenda for the night; they are not a prize and not a pushover.",
    formatInterest(flirtation.interest),
    "",
    flirtation.premise.trim()
      ? `The player set this premise: "${flirtation.premise.trim()}". Honor it.`
      : "The player gave no specific premise; invent a believable reason the two of you have ended up talking.",
    "",
    "The loop is read -> say -> react. You narrate a beat and offer moves; the player picks one or writes their own line or gesture; you write how the love interest reacts. Reactions must be earned and honest: a clumsy or pushy move cools them off, a witty or genuinely attentive one warms them up, and an over-eager move can read as try-hard. Never just rubber-stamp the player - this person has standards, moods, and a life outside this conversation.",
    "",
    "Each beat you must return:",
    "- narration: vivid second-person prose for this beat (you/your), 2-4 short paragraphs. Show how your last line landed - their expression, body language, what they say back - and end on an opening for the player. Keep dialogue snappy and in-character. Do not list the moves inside the narration.",
    "- moves: 2 to 4 distinct, concrete things the player could say or do next, each a short label plus a one-line hint at how it might land. Make them genuinely different in tactic (earnest vs. teasing vs. bold vs. retreat), not three shades of the same line. Leave empty ONLY when the encounter ends this beat.",
    "- state: the FULL current state after this beat - attraction (0 walking away, 100 smitten), mood (a word or two), location, chemistry (sparks that landed), missteps (things that fell flat), and a one-line read. Re-state all of it every time (a snapshot, not a delta). Move attraction in believable steps, rarely more than ~15 at once, and let it fall as readily as it rises.",
    "- isEnding: true only when the encounter reaches a real conclusion - they fall for the player (attraction at/near 100), they walk away or shut it down (attraction at/near 0), or the night naturally ends. When true, moves must be empty and the narration should land the ending.",
    "- endingKind: when isEnding is true, one of smitten (they're won over), rejected (they leave), friends (warm but no spark), or open (left hanging); otherwise null.",
    "",
    "Tone and limits: keep it flirtatious, witty, and warm but tasteful - PG-13 at most. Romantic and sexual tension is welcome; explicit sexual content is not - fade to black if it ever gets there. The love interest's consent and comfort are real and always respected; pressure, coercion, or ignoring a clear 'no' should cool or end the encounter, never reward it. Pacing: do not have them fall instantly or storm off over nothing in the first beats; let it build.",
    "",
    `Write the narration, every move label and hint, the mood, location, and read in ${flirtation.language}. Never break character or mention being an AI.`,
  ].join("\n")

export const buildOpeningPrompt = (flirtation: Flirtation): string =>
  [
    `Open the encounter. Establish ${flirtation.interest.name} in a striking opening beat - the moment the player first notices them or ends up beside them in this setting. Give them presence: what they're doing, how they carry themselves, the first thing they say or the look they give. Let who they are (their vibe, background, what they're looking for) color it.`,
    "Set the starting state: a concrete location within the setting, an opening attraction around 15-30 (curiosity, not infatuation), their initial mood, empty chemistry and missteps, and a one-line read of the moment.",
    "End on an opening for the player and offer the first 2-4 moves. isEnding must be false.",
    "",
    `Write everything in ${flirtation.language}.`,
  ].join("\n")

export interface ContinuePromptInput {
  flirtation: Flirtation
  /** How things stood coming into this beat. */
  state: MoodState
  /** The line or move the player chose or typed. */
  move: string
}

const formatState = (state: MoodState): string =>
  [
    `- Attraction: ${state.attraction}/100`,
    `- Mood: ${state.mood || "unreadable"}`,
    `- Location: ${state.location || "unknown"}`,
    `- Chemistry: ${state.chemistry.length ? state.chemistry.join(", ") : "none yet"}`,
    `- Missteps: ${state.missteps.length ? state.missteps.join(", ") : "none yet"}`,
    `- Read: ${state.read || "too early to tell"}`,
  ].join("\n")

export const buildContinuePrompt = ({
  flirtation,
  state,
  move,
}: ContinuePromptInput): string =>
  [
    `Where things stand with ${flirtation.interest.name} right now:`,
    formatState(state),
    "",
    `The player makes this move: "${move.trim()}"`,
    "",
    "Write how they react - honestly, in character - update the state accordingly, and offer the next moves (unless the encounter ends here).",
    "",
    `Write everything in ${flirtation.language}.`,
  ].join("\n")

export interface InterestPromptInput {
  scenario: Scenario
  /** The premise the player set, if any, to ground the person. */
  premise?: string
  /** A name or concept the player already has in mind, if any. */
  hint?: string
  /** Partly-filled fields to keep; the model fills only the blanks. */
  seed?: Partial<LoveInterest>
  language: string
}

const SEED_LABELS: Record<keyof LoveInterest, string> = {
  name: "Name",
  pronouns: "Pronouns",
  age: "Age",
  vibe: "Vibe",
  appearance: "Appearance",
  personality: "Personality",
  background: "Background",
  lookingFor: "Looking for",
}

/**
 * Prompt to generate a full, coherent love interest for a new flirtation. Asks
 * for every field, fitting the setting and premise, while preserving any
 * fields the player already filled. The person is always an adult.
 */
export const buildInterestPrompt = ({
  scenario,
  premise,
  hint,
  seed,
  language,
}: InterestPromptInput): string => {
  const lines = [
    `Create a vivid, charming-but-not-easy adult to flirt with, someone who fits ${SCENARIO_FLAVOR[scenario]} (${SCENARIO_LABELS[scenario]}).`,
    "Fill in every field so they form one coherent person: a fitting name, pronouns, an adult age, a one-phrase vibe, a brief physical appearance, a personality with real edges (what charms them and what bores or annoys them), a background that gives them a life, and what they're quietly looking for tonight (or insist they're not).",
    "Keep each field concise - a phrase or a sentence or two, not an essay. Make them interesting to win over, with genuine standards - not a pushover and not a cliche.",
  ]

  if (premise?.trim()) {
    lines.push("", `Fit them to this premise: "${premise.trim()}".`)
  }
  if (hint?.trim()) {
    lines.push("", `Build on this idea from the player: "${hint.trim()}".`)
  }

  const kept = seed
    ? (Object.keys(SEED_LABELS) as Array<keyof LoveInterest>)
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
    `Write all field values in ${language}. Keep proper nouns natural for that language. The person must be an adult.`
  )

  return lines.join("\n")
}
