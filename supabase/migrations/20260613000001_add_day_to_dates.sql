-- Add a day-of-month component to every in-game date. The engine's GameDate
-- gained a `day` field (packages/engine/src/types.ts), so the game clock, the
-- message log, events, and the scheduled-event queue all carry a day now.
--
-- Existing rows predate the day field, so each column defaults to 1 (the
-- first of the month), matching how the engine starts a game.

alter table public.games
  add column current_day integer not null default 1
    check (current_day between 1 and 31);

alter table public.game_messages
  add column game_day integer not null default 1
    check (game_day between 1 and 31);

alter table public.game_events
  add column day integer not null default 1
    check (day between 1 and 31);

alter table public.game_scheduled_events
  add column due_day integer not null default 1
    check (due_day between 1 and 31),
  add column scheduled_day integer not null default 1
    check (scheduled_day between 1 and 31);

-- Extend the timeline / queue ordering indexes to break ties on the day.
drop index if exists public.game_events_game_idx;
create index game_events_game_idx
  on public.game_events (game_id, year, month, day);

drop index if exists public.game_scheduled_events_game_idx;
create index game_scheduled_events_game_idx
  on public.game_scheduled_events (game_id, due_year, due_month, due_day);
