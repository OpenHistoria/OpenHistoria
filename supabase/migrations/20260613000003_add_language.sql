-- Games record the human language the model writes narration and events in
-- (set from the UI locale at creation), so generated content matches what the
-- player reads. See packages/engine/src/engine.ts (DEFAULT_LANGUAGE).

alter table public.games
  add column language text not null default 'English';
