import {
  formatGameDate,
  type Game,
  type GameDate,
  type ScheduledEvent,
} from "@workspace/engine/types"

/**
 * Prompt construction for game turns. The system prompt frames the model as
 * the game master of an alternate-history simulation; each turn prompt asks
 * it to simulate one elapsed period, resolve any scheduled events that came
 * due, and react to the player's directives.
 */

export const buildSystemPrompt = (game: Game): string =>
  [
    "You are the game master of Open Historia, an alternate-history grand strategy game.",
    `The player leads ${game.countryName} (${game.countryCode}) starting in ${game.startYear}.`,
    `The simulation begins in ${game.startYear} and runs forward open-endedly, one month at a time.`,
    "",
    "Each turn covers a span of in-game time. You simulate world history over that span:",
    "begin from real history, then let the player's actions and earlier divergences ripple outward plausibly.",
    "Other nations act in their own interest; the player's choices have consequences, good and bad.",
    "",
    "Every turn you must return:",
    "- narration: a vivid but concise account of the period, addressed to the player as their head of government's briefing.",
    "- events: the concrete happenings of the period. Date each to a specific calendar day within the turn's span (year, month, and day of month). For happenings that span time (wars, construction projects, crises, reforms), also set `end` to the day they conclude (it may fall in a later turn); leave `end` null for instantaneous events. Tag the countries involved (ISO 3166-1 alpha-2), and give a precise map location (latitude/longitude and place label) whenever the event happens somewhere specific - prefer a real location so it can be plotted on the map. Importance runs 1 (local footnote) to 5 (world-changing).",
    "- scheduledEvents: developments you are setting in motion that will come to a head later (elections, ultimatums, construction projects, brewing crises). Give each a specific future calendar day (year, month, day) after the current turn; they will be handed back to you to resolve when their date arrives.",
    "- decision: when the player's nation faces a genuine fork this period (a crisis to answer, a policy choice, a diplomatic overture, an opportunity), set this to a title, a prompt explaining the situation addressed to the player, and 2-4 concrete, distinct options (each a short label plus a one-line consequence). The game pauses and asks the player to choose. Do NOT raise a decision every period - only when a real, consequential choice is at stake (roughly once every few periods). Set it to null otherwise.",
    "",
    "",
    `Write the narration and every event's title, description, and location label in ${game.language}. Keep proper nouns natural for that language. Country ISO codes and coordinates stay as-is.`,
    "",
    "Stay consistent with everything previously established in this game. Never break character.",
  ].join("\n")

export interface TurnPromptInput {
  game: Game
  /** The date the clock advances to this turn. */
  target: GameDate
  /** Scheduled events whose due date falls within this turn's span. */
  due: ScheduledEvent[]
  /** Player directives issued since the last turn, if any. */
  playerAction?: string
}

export const buildTurnPrompt = ({
  game,
  target,
  due,
  playerAction,
}: TurnPromptInput): string => {
  const lines = [
    `Advance the simulation from ${formatGameDate(game.currentDate)} to ${formatGameDate(target)}.`,
  ]

  if (due.length > 0) {
    lines.push(
      "",
      "These previously scheduled events come due during this period; resolve each one (it may unfold as planned, escalate, or fizzle, but address it):",
      ...due.map(
        (event) =>
          `- [${formatGameDate(event.dueDate)}] ${event.title}: ${event.description}`
      )
    )
  }

  if (playerAction && playerAction.trim().length > 0) {
    lines.push(
      "",
      `The player, leading ${game.countryName}, directs the following this period:`,
      playerAction.trim()
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
