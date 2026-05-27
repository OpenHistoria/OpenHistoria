# Changelog

Notable changes are grouped by round. Each round corresponds to a single
`feat:` commit on `main`; the list is curated, not exhaustive.

## Round 13
- **Lobby shift briefings**: when a lobby crosses 75 or 25, a one-shot
  milestone / warning lands in the briefing. Rearms when satisfaction
  returns to the neutral band.
- **Election countdown banner** pinned next to the time controls: live days
  remaining plus reform-agenda status, with colour escalation at T-30/T-7.
- Lobby snapshots added to weekly `HistorySample`. Optional field so older
  saves keep loading.

## Round 12
- **Lobby reactions to events**: `applyLobbyEventReaction` maps event
  category + signed choice effects to immediate lobby shifts, wired into
  both player resolution and the cabinet auto-resolve path.
- Third candidate per cabinet role (8 new candidates) with distinct bonus
  shapes.
- New **Settings dialog** consolidating theme + sound (pause menu loses the
  inline ThemePicker).
- Diplomacy panel rows expand to show AI profile (stance, base opinion,
  activity, project-kind reactions).

## Round 11
- **Lobby groups**: five interest groups (unions, industry, ecology, defence,
  public sector) with satisfaction that drifts toward a state-derived
  baseline. Extreme satisfaction adds a small daily approval shift; surfaced
  as a strip in the country-stats panel.
- **CHANGELOG.md**: this file.

## Round 10
- **Past mandates** log: every finished run is summarised and persisted in
  localStorage (cap 20). Listed in a pause-menu dialog.
- **Decision ROI hints** show ≈ upfront cost, completion approval / GDP, and
  rough duration per kind.
- **PWA manifest** + SVG icon make the app installable.
- 3 more late-mandate scheduled events (Ukraine aid, Conseil constitutionnel,
  Airbus order).

## Round 9
- **End-of-mandate retrospective**: deterministic newspaper-style recap
  surfaced in the game-over dialog (`buildRetrospective`).
- **Save slots**: three named manual save slots beside the autosave, backed
  by `Result<…, StorageError>`.
- CI runs `npm run lint` as a non-fatal step.

## Round 8
- **AI-initiated proposals**: alliances, joint defence, trade pacts, démarches,
  state visits — fired as high-severity events when the player has been quiet
  with a given nation.
- **Approval breakdown** panel showing annualised drivers (drift, cabinet,
  deficit, project burn).
- **Bond €30B** action gets a two-click confirmation.
- **Engine docs**: `packages/engine/README.md`.
- **Perf benchmark**: 1y sim < 2s.

## Round 7
- **Synthesised audio** (`apps/web/lib/sfx.ts`) — chime / alert / achievement
  / swoosh / click via the Web Audio API. Mute toggle in the pause menu.
- **History chart dialog** for treasury / approval / GDP / unemployment.
- Inline **Message** button from the diplomacy panel.
- Coverage step + README badges.

## Round 6
- **CI workflow** (typecheck + test + lint + non-fatal coverage upload).
- **Named election rivals** (Le Pen, Mélenchon) with weight that reacts to
  player vulnerabilities.
- **Trophy room** dialog listing achievements with locked/unlocked state.
- **Press headlines** view in the briefing panel.
- **Event chain preconditions** (`requires`) and two paired follow-up events.
- **Tutorial hints** as one-shot non-blocking toasts.

## Round 5
- **Cabinet appointments**: each role has two alternates with distinct bonus
  profiles. `Game.appointMinister` swaps the active candidate.
- **Election Poll** HUD widget.
- **Achievement toasts** with localStorage persistence.
- **Briefing search** + larger window (200 cap).
- **Determinism test**: same seed → byte-identical snapshot.

## Round 4
- **Player sanctions and trade deals** symmetric to AI economic actions, with
  the same 90-day cooldown.
- **Map opinion markers** at AI capitals tinted by current opinion.
- **Auto-pause** on tab hidden.
- **Theme toggle**, debug overlay persists open state.
- Two more reform agendas; five more procedural event templates.

## Round 3
- **Cabinet bonuses** wired into engine arithmetic.
- 4 more AI nations (BR, IN, AU, CA) for 12 total.
- **Diplomacy dashboard** floating panel; Press toggle.
- **Save export/import** in the pause menu.
- **Briefing filters**.
- **Game-over sparklines** for approval and treasury.

## Round 2
- UTC-safe event date matching.
- **Bond hard cap** at 160% debt/GDP with progressive stress cost.
- **Proactive warnings** before bankruptcy / impeachment.
- **Election countdown** milestones at T-90 / T-30 / T-7.
- Six more scheduled story events.
- Game-over dialog dispatches on cause-specific copy + icon.

## Round 1
- Snapshot v5 with bankruptcy / impeachment / reform-agenda support.
- AI nations: drift, alliances, quarterly economic actions.
- Procedural events with cooldowns and severity.
- NaN-safe economy arithmetic; treasury floor.
- Save quarantine for corrupt blobs.
- Tick loop wrapped in try/catch with toast + auto-pause.

## Engineering
- All error-handling refactored to `neverthrow` `Result` / `ResultAsync` (no
  raw `try`/`catch` in domain code).
- Storage versioning with migrators for v1 → v5.
- 155 vitest tests covering engine determinism, economy, events, cabinet,
  AI, lobbies, retrospective, save slots, perf.
