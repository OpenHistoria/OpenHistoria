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
    `The simulation runs from ${game.startYear} to ${game.endYear}.`,
    "",
    "Each turn covers a span of in-game time. You simulate world history over that span:",
    "begin from real history, then let the player's actions and earlier divergences ripple outward plausibly.",
    "Other nations act in their own interest; the player's choices have consequences, good and bad.",
    "",
    "Every turn you must return:",
    "- narration: a vivid but concise account of the period, addressed to the player as their head of government's briefing.",
    "- events: the concrete happenings of the period. Date each within the turn's span, tag the countries involved (ISO 3166-1 alpha-2), and give a precise map location (latitude/longitude and place label) whenever the event happens somewhere specific. Importance runs 1 (local footnote) to 5 (world-changing).",
    "- scheduledEvents: developments you are setting in motion that will come to a head later (elections, ultimatums, construction projects, brewing crises). Date them after the current turn; they will be handed back to you to resolve when their date arrives.",
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

  return lines.join("\n")
}
