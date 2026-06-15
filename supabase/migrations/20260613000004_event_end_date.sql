-- Events can span time (wars, construction, crises): an optional end date.
-- Null for instantaneous events. See packages/engine/src/types.ts (GameEvent).

alter table public.game_events
  add column end_year integer
    check (end_year is null or end_year between -100000 and 100000),
  add column end_month integer check (end_month is null or end_month between 1 and 12),
  add column end_day integer check (end_day is null or end_day between 1 and 31);
