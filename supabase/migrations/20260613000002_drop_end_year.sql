-- Games are now open-ended: they play forward one month at a time with no
-- final year, so the games.end_year column is gone (the engine no longer
-- reads or writes it). See packages/engine/src/engine.ts.

alter table public.games
  drop column if exists end_year;
