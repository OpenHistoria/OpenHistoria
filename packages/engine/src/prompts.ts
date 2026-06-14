import {
  formatGameDate,
  type Game,
  type GameDate,
  type GameEvent,
  type ScheduledEvent,
} from "@workspace/engine/types"

/**
 * Prompt construction for game turns and the conseiller.
 *
 * The model plays a "words to action to reaction" loop, Pax-Historia style:
 * the player states intentions for their nation, then jumps time forward; the
 * model simulates how the world responds over the elapsed span and reports it
 * as concrete, dated events. Time is frozen between jumps - nothing happens
 * until the player chooses to advance, and they choose how far.
 */

export const buildSystemPrompt = (game: Game): string =>
  [
    "You are the game master of Open Historia, an alternate-history grand strategy game in the spirit of Pax Historia.",
    `The player leads ${game.countryName} (${game.countryCode}), starting in ${game.startYear}.`,
    "The world begins from real history; the player's actions and the divergences they cause then ripple outward plausibly.",
    "",
    "The loop is words -> action -> reaction. Between turns, time is frozen. When the player jumps time forward you simulate everything that happens across the world during that span: you carry out the player's directives as far as is realistic, and every other nation and actor reacts in its own interest. The player's choices have consequences, good and bad; do not simply rubber-stamp their wishes - powers resist, plans backfire, and history pushes back.",
    "",
    "Each jump you must return:",
    "- narration: a vivid but concise briefing of the period, addressed to the player as their head of government. This is the headline account they read first.",
    "- events: the concrete happenings of the span, in chronological order. Date each to a specific calendar day within the span (year, month, day). For happenings that unfold over time (wars, construction, crises, reforms), also set `end` to the day they conclude (it may fall after this span); leave `end` null for instantaneous events. Tag the countries involved (ISO 3166-1 alpha-2), and give a precise real-world map location (latitude/longitude and place label) whenever the event happens somewhere specific, so it can be plotted. Importance runs 1 (local footnote) to 5 (world-changing). Aim for a handful of events on a short jump and more on a long one.",
    "- scheduledEvents: developments you are setting in motion that will come to a head later (elections, ultimatums, offensives, projects, brewing crises). Give each a specific future calendar day after this span; they are handed back to you to resolve when their date arrives.",
    "- advancedTo: see the per-turn instruction. On a fixed-length jump, repeat the target date you were given. On an open-ended \"advance to the next major development\" jump, set this to the day you chose to stop on.",
    "- decision: when the player's nation faces a genuine fork this period (a crisis to answer, a policy choice, a diplomatic overture, an opportunity), set a title, a prompt explaining the situation addressed to the player, and 2-4 concrete, distinct options (each a short label plus a one-line consequence). The game pauses and asks the player to choose. Do NOT raise a decision every jump - only when a real, consequential choice is at stake. Set it to null otherwise.",
    "",
    `Write the narration and every event's title, description, and location label in ${game.language}. Keep proper nouns natural for that language. Country ISO codes and coordinates stay as-is.`,
    "",
    "Stay consistent with everything previously established in this game. Never break character.",
  ].join("\n")

export interface TurnPromptInput {
  game: Game
  /**
   * The date the jump advances to on a fixed-length jump. On an auto jump this
   * is the furthest the model may advance (the horizon); the model picks a day
   * at or before it.
   */
  target: GameDate
  /** Scheduled events whose due date falls within this span. */
  due: ScheduledEvent[]
  /** Player directives issued for this jump, if any. */
  playerAction?: string
  /**
   * Open-ended jump: instead of advancing a fixed span, advance to the next
   * major development, choosing the stop date (at or before `target`).
   */
  auto?: boolean
}

export const buildTurnPrompt = ({
  game,
  target,
  due,
  playerAction,
  auto,
}: TurnPromptInput): string => {
  const lines = auto
    ? [
        `Advance the simulation from ${formatGameDate(game.currentDate)} to whenever the next major development for ${game.countryName} or its region arrives - a turning point worth briefing the player on.`,
        `Do not advance past ${formatGameDate(target)}; if nothing momentous occurs before then, stop there and report the quieter period. Set advancedTo to the exact day you stop on, and date every event on or before it.`,
      ]
    : [
        `Advance the simulation from ${formatGameDate(game.currentDate)} to ${formatGameDate(target)}. Set advancedTo to ${formatGameDate(target)} and date every event within this span.`,
      ]

  if (due.length > 0) {
    lines.push(
      "",
      "These previously scheduled developments come due in this window; resolve each one (it may unfold as planned, escalate, or fizzle, but address it). Ignore any whose date falls after you choose to stop:",
      ...due.map(
        (event) =>
          `- [${formatGameDate(event.dueDate)}] ${event.title}: ${event.description}`
      )
    )
  }

  if (playerAction && playerAction.trim().length > 0) {
    lines.push(
      "",
      `The player, leading ${game.countryName}, directs the following for this period:`,
      playerAction.trim(),
      "",
      "Carry these out only as far as is realistic given resources, time, and how other powers react. Some may partly fail or provoke pushback."
    )
  } else {
    lines.push(
      "",
      `The player issues no special directives; ${game.countryName} continues its current course.`
    )
  }

  lines.push("", `Write everything in ${game.language}.`)

  return lines.join("\n")
}

export interface AdvisorPromptInput {
  game: Game
  /** Recent events, oldest first, for situational context. */
  recentEvents: GameEvent[]
  /** Pending scheduled developments, soonest first. */
  scheduled: ScheduledEvent[]
  /** Directives the player has queued but not yet jumped on. */
  directives: string[]
}

const formatEventLine = (event: GameEvent): string =>
  `- [${formatGameDate(event.date)}] ${event.title} (${event.kind}): ${event.description}`

/**
 * System prompt for the conseiller: the player's chief strategic advisor. It
 * sees the current world state and gives candid, actionable counsel, and may
 * propose concrete directives the player can issue with one click.
 */
export const buildAdvisorPrompt = ({
  game,
  recentEvents,
  scheduled,
  directives,
}: AdvisorPromptInput): string => {
  const lines = [
    `You are the chief strategic advisor (conseiller) to the leader of ${game.countryName} (${game.countryCode}) in the alternate-history game Open Historia.`,
    `The current date is ${formatGameDate(game.currentDate)}. You speak privately with the leader (the player), who decides everything; you advise.`,
    "",
    "Give candid, specific, actionable counsel grounded in the situation: read the balance of power, name concrete options and their risks, and warn against likely mistakes (anachronistic or self-defeating moves). Be concise - a few tight paragraphs at most, no filler. Stay in character as a period-appropriate advisor; never break the fourth wall about being an AI.",
    "",
    "When useful, propose up to three directives in suggestedActions: each must be a concrete order the leader could issue verbatim this turn (imperative and specific, e.g. \"Mobilize two divisions to the eastern frontier\"). Leave it empty when the player only wants analysis. Do not restate the directives inside your reply - they are shown separately.",
  ]

  if (recentEvents.length > 0) {
    lines.push(
      "",
      "Recent developments (most recent last):",
      ...recentEvents.map(formatEventLine)
    )
  }

  if (scheduled.length > 0) {
    lines.push(
      "",
      "Looming developments already set in motion:",
      ...scheduled.map(
        (s) => `- [${formatGameDate(s.dueDate)}] ${s.title}: ${s.description}`
      )
    )
  }

  if (directives.length > 0) {
    lines.push(
      "",
      "Directives the leader has queued for the next jump but not yet enacted:",
      ...directives.map((d) => `- ${d}`)
    )
  }

  lines.push(
    "",
    `Reply in ${game.language}, in the second person to the leader.`
  )

  return lines.join("\n")
}
