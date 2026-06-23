import {
  DIFFICULTY_LABELS,
  SETTING_LABELS,
  type Case,
  type CaseState,
  type Detective,
  type Difficulty,
  type Setting,
  type Suspect,
} from "@workspace/detective-engine/types"

/**
 * Prompt construction for the detective game master.
 *
 * The loop is investigate -> uncover -> deduce: the model narrates what the
 * detective finds and offers actions, the player picks one (or writes their
 * own), and the model answers with the next beat. The whole mystery is fixed
 * up front in a hidden dossier - victim, suspects, and the true culprit - so
 * every clue the model surfaces stays consistent and the case is genuinely
 * solvable. Only when the player accuses someone is the truth revealed.
 */

const SETTING_FLAVOR: Record<Setting, string> = {
  manor:
    "a grand country manor cut off by a storm, full of old money, older grudges, and a houseful of guests with something to hide",
  noir:
    "a rain-slicked 1940s city of smoke-filled offices, crooked cops, and dames who spell trouble",
  victorian:
    "fog-bound Victorian London of gaslit streets, séances, and respectable men with unspeakable secrets",
  express:
    "a luxury express train racing through the night, its passengers sealed in together with a killer among them",
  academia:
    "a centuries-old university of jealous dons, locked archives, and ambition sharp enough to kill for",
  island:
    "a remote island estate where the boat won't return for days and the guests are being picked off",
  cyberpunk:
    "a neon megacity where memories can be edited, alibis can be bought, and the dead don't always stay offline",
  occult:
    "a town where the murder wears the mask of the supernatural, and someone is counting on you to believe it",
}

const DIFFICULTY_GUIDANCE: Record<Difficulty, string> = {
  rookie:
    "Keep it fair and readable: 3-4 suspects, a clear motive, and clues that point cleanly once found. One mild red herring at most.",
  detective:
    "A solid puzzle: 4-5 suspects, a couple of plausible alternative culprits, two or three red herrings, and clues that need connecting.",
  mastermind:
    "A devious puzzle: 5-6 suspects, several with strong motives and shaky alibis, layered red herrings, and a culprit who hides behind a convincing innocent.",
}

/** A bulleted block of the detective's filled-in fields, omitting blanks. */
const formatDetective = (detective: Detective): string => {
  const lines: string[] = [`- Name: ${detective.name || "unnamed"}`]
  if (detective.pronouns.trim())
    lines.push(`- Pronouns: ${detective.pronouns.trim()}`)
  if (detective.role.trim()) lines.push(`- Role: ${detective.role.trim()}`)
  if (detective.style.trim()) lines.push(`- Style: ${detective.style.trim()}`)
  if (detective.background.trim())
    lines.push(`- Background: ${detective.background.trim()}`)
  return lines.join("\n")
}

const formatSuspect = (suspect: Suspect): string =>
  [
    `- ${suspect.name} (${suspect.role}): ${suspect.description}`,
    `  Alibi: ${suspect.alibi}`,
    `  Secret: ${suspect.secret}`,
  ].join("\n")

/**
 * The full case briefing, including the hidden solution. Sent to the model on
 * every round so the mystery stays internally consistent. NEVER shown to the
 * player.
 */
export const buildSystemPrompt = (theCase: Case): string =>
  [
    "You are the game master of Open Case, an AI-driven detective mystery.",
    `The case is "${theCase.title}", set in ${SETTING_FLAVOR[theCase.setting]} (${SETTING_LABELS[theCase.setting]}).`,
    "",
    "The player controls this detective. Stay true to them: their voice, methods, and reputation shape how they work and how people react to them.",
    formatDetective(theCase.detective),
    "",
    "THE CRIME (public facts the detective knows):",
    `- Victim: ${theCase.victim}`,
    `- What happened: ${theCase.crimeSummary}`,
    "",
    "THE SUSPECTS (their alibis are what they SAY; their secrets are the private truth only you know):",
    theCase.suspects.map(formatSuspect).join("\n"),
    "",
    "THE SOLUTION (the hidden truth - this is ground truth, NEVER state it outright to the player):",
    `- Culprit: ${theCase.solution.culprit}`,
    `- Motive: ${theCase.solution.motive}`,
    `- Method: ${theCase.solution.method}`,
    `- Key evidence that points to them: ${theCase.solution.keyEvidence.join("; ")}`,
    "",
    "Run the investigation honestly. Surface clues gradually as the detective looks in the right places and asks the right questions. The culprit lies and misdirects; innocent suspects may have unrelated secrets (red herrings) and act guilty for reasons that have nothing to do with the murder. Real evidence must always be consistent with the solution above - never invent a clue that contradicts it, and never let the trail point at the wrong person as if it were the truth. The case must remain genuinely solvable from the clues you reveal.",
    "",
    "Each round you must return:",
    "- narration: vivid second-person prose for this beat (you/your), 2-4 short paragraphs. Show what the detective observes, hears, or deduces in response to their last action; let suspects speak in their own voices. End on a new opening for action. Do not list the actions inside the narration.",
    "- choices: 2 to 5 distinct, concrete investigative actions (examine a place or object, question or press a suspect, follow a lead, revisit evidence), each a short imperative label plus a one-line hint. Make them genuinely different routes, not flavors of one move.",
    "- state: the FULL current investigation state after this beat - location, clues gathered, open leads, and suspects ruled out. Re-state all of it every time (a snapshot, not a delta). Only add a clue once it has actually been discovered in the narration; only clear a suspect once their innocence is genuinely established.",
    "",
    "Never reveal the culprit, hand the player the solution, or accuse anyone on the detective's behalf - the player decides when and whom to accuse. Keep continuity with everything already established: names, places, statements, and contradictions all persist.",
    "",
    `Write the narration, every choice label and hint, and all state values in ${theCase.language}. Never break character or mention being an AI.`,
  ].join("\n")

export const buildOpeningPrompt = (theCase: Case): string =>
  [
    `Open the case. ${theCase.detective.name} arrives at the scene. Set the atmosphere of ${SETTING_LABELS[theCase.setting]}, establish the victim and the unsettling circumstances of the crime as the detective first takes them in, and introduce the situation without naming a culprit or handing over conclusions.`,
    "Set the starting state: the detective's location (the crime scene), any clues immediately obvious on arrival, the first leads worth chasing, and no suspects cleared yet.",
    "End on a clear opening for action and offer the first 2-5 investigative actions.",
    "",
    `Write everything in ${theCase.language}.`,
  ].join("\n")

export interface ContinuePromptInput {
  theCase: Case
  /** The investigation state coming into this beat. */
  state: CaseState
  /** The action the player chose or typed. */
  action: string
}

const formatState = (state: CaseState): string =>
  [
    `- Location: ${state.location || "unknown"}`,
    `- Clues so far: ${state.clues.length ? state.clues.join("; ") : "none yet"}`,
    `- Open leads: ${state.leads.length ? state.leads.join("; ") : "none"}`,
    `- Suspects ruled out: ${state.cleared.length ? state.cleared.join(", ") : "none"}`,
  ].join("\n")

export const buildContinuePrompt = ({
  theCase,
  state,
  action,
}: ContinuePromptInput): string =>
  [
    "Where the investigation stands right now:",
    formatState(state),
    "",
    `The detective takes this action: "${action.trim()}"`,
    "",
    "Narrate what they find as a believable, consistent consequence - reveal new clues only where they would plausibly turn up, let suspects react in character, and update the state accordingly. Then offer the next investigative actions.",
    "",
    `Write everything in ${theCase.language}.`,
  ].join("\n")

export interface AccusationPromptInput {
  theCase: Case
  /** The suspect the player named. */
  accused: string
  /** The player's reasoning / proposed motive and method, if any. */
  reasoning: string
  /** Whether the accused is in fact the culprit. */
  correct: boolean
}

/**
 * The confrontation. The verdict is decided in code (by matching the accused
 * to the hidden culprit), so this prompt is told the outcome and asked only to
 * stage the reveal as dramatic prose.
 */
export const buildAccusationPrompt = ({
  theCase,
  accused,
  reasoning,
  correct,
}: AccusationPromptInput): string =>
  [
    `The detective gathers everyone and accuses ${accused} of the murder of ${theCase.victim}.`,
    reasoning.trim()
      ? `Their case: "${reasoning.trim()}"`
      : "They lay out their reasoning from the evidence gathered.",
    "",
    correct
      ? `This accusation is CORRECT. ${theCase.solution.culprit} is the killer. Stage the confrontation: walk through how the evidence convicts them, let them break or be unmasked, and confirm the true motive (${theCase.solution.motive}) and method (${theCase.solution.method}). Land a satisfying resolution.`
      : `This accusation is WRONG. The real killer is ${theCase.solution.culprit}, whose motive was ${theCase.solution.motive} and method was ${theCase.solution.method}. Stage the confrontation: show the accusation fall apart, the accused's innocence (or the real culprit slipping away / the truth coming out too late), and reveal who really did it and how. Make the failure sting but feel fair given what was missed.`,
    "",
    "Write 2-4 paragraphs of second-person prose (you/your). This is the closing scene of the case - do not offer further actions.",
    "",
    `Write everything in ${theCase.language}.`,
  ].join("\n")

export interface DetectivePromptInput {
  setting: Setting
  /** The case hook the player set, if any, to tilt the persona toward it. */
  premise?: string
  language: string
}

/**
 * Prompt to invent a single detective persona that fits the chosen setting -
 * the five fields the New Case form asks for. Used to fill the form when the
 * player would rather be handed a character than write one.
 */
export const buildDetectivePrompt = ({
  setting,
  premise,
  language,
}: DetectivePromptInput): string => {
  const lines = [
    `Invent a single, vivid detective to work a murder set in ${SETTING_FLAVOR[setting]} (${SETTING_LABELS[setting]}).`,
    "",
    "Return a complete persona:",
    "- name: a memorable full name that fits the setting.",
    '- pronouns: e.g. "she/her", "he/him", "they/them".',
    "- role: their rank, profession, or reputation (e.g. Scotland Yard inspector, jaded private eye, insurance investigator).",
    "- style: how they work and carry themselves - method and temperament - in a sentence or two.",
    "- background: where they come from and what they bring into this case, in a sentence or two.",
    "",
    "Make them distinctive and a natural fit for the setting, not a generic everyman. Do not reuse famous fictional detectives by name.",
  ]

  if (premise?.trim()) {
    lines.push(
      "",
      `The case hook is: "${premise.trim()}". Lean the detective toward someone this case would land on.`
    )
  }

  lines.push(
    "",
    `Write every field value in ${language}. Keep proper nouns natural for that language.`
  )

  return lines.join("\n")
}

export interface CaseFilePromptInput {
  setting: Setting
  difficulty: Difficulty
  /** The premise the player set, if any, to ground the case. */
  premise?: string
  /** The detective the case is built around, to tailor tone. */
  detective: Detective
  language: string
}

/**
 * Prompt to invent a complete, self-consistent mystery for a new case: the
 * victim, the public crime, the full suspect cast (each with an alibi and a
 * secret), and the hidden solution. The culprit must be one of the suspects.
 */
export const buildCaseFilePrompt = ({
  setting,
  difficulty,
  premise,
  detective,
  language,
}: CaseFilePromptInput): string => {
  const lines = [
    `Design a complete, fair, self-consistent murder mystery set in ${SETTING_FLAVOR[setting]} (${SETTING_LABELS[setting]}).`,
    `Difficulty: ${DIFFICULTY_LABELS[difficulty]}. ${DIFFICULTY_GUIDANCE[difficulty]}`,
    "",
    "Return:",
    "- title: an evocative case title.",
    "- victim: the victim's name and a one-line description.",
    "- crimeSummary: the public facts a detective would know on arrival - who died, where, how the body was found, the apparent circumstances. Do NOT reveal who did it.",
    "- suspects: the full cast. For each: name, role/relationship to the victim, a brief description, the alibi they give (which may be a lie), and a secret they are hiding. Give innocent suspects secrets that are real but UNRELATED to the murder (red herrings).",
    "- solution: the hidden truth - the culprit (whose name MUST exactly match one of the suspects), their motive, their method, and the key pieces of evidence that, once found, point to them.",
    "",
    "Make it solvable: the key evidence must genuinely implicate the culprit and be discoverable through investigation. Make every suspect plausible enough to suspect.",
  ]

  if (premise?.trim()) {
    lines.push("", `Build the case around this hook from the player: "${premise.trim()}".`)
  }

  if (detective.name.trim() || detective.role.trim()) {
    lines.push(
      "",
      `The investigating detective is ${detective.name.trim() || "a detective"}${detective.role.trim() ? `, ${detective.role.trim()}` : ""}. Pitch the case as a fitting assignment for them, but do not write them into the suspect list.`
    )
  }

  lines.push(
    "",
    `Write all field values in ${language}. Keep proper nouns natural for that language.`
  )

  return lines.join("\n")
}
