-- Game sessions and their full histories for the Open Historia engine
-- (packages/engine/src/supabase-store.ts maps these tables to the domain
-- model). Every row is owned by an auth user; anonymous (guest) sessions
-- count as authenticated, and when a guest later attaches an email the
-- user id stays the same, so their games follow them automatically.
--
-- All timestamps are timestamptz. game_messages.created_at records the
-- exact wall-clock moment of each AI exchange, written by the client so it
-- matches what the player saw.

-- ----------------------------------------------------------------------
-- games: one row per session (country, clock position, status).
-- ----------------------------------------------------------------------
create table public.games (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  country_code text not null,
  country_name text not null,
  start_year integer not null,
  end_year integer not null,
  current_year integer not null,
  current_month integer not null check (current_month between 1 and 12),
  status text not null check (status in ('active', 'completed')),
  model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index games_user_idx on public.games (user_id, updated_at desc);

-- ----------------------------------------------------------------------
-- game_messages: the complete AI conversation log, timestamped per message.
-- ----------------------------------------------------------------------
create table public.game_messages (
  id uuid primary key,
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  game_year integer not null,
  game_month integer not null check (game_month between 1 and 12),
  created_at timestamptz not null default now()
);

create index game_messages_game_idx on public.game_messages (game_id, created_at);

-- ----------------------------------------------------------------------
-- game_events: everything that happened on the timeline / map.
-- ----------------------------------------------------------------------
create table public.game_events (
  id uuid primary key,
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  title text not null,
  description text not null,
  kind text not null,
  countries text[] not null default '{}',
  lat double precision,
  lng double precision,
  location_label text,
  importance integer not null check (importance between 1 and 5),
  source text not null check (source in ('model', 'scheduled', 'player')),
  created_at timestamptz not null default now()
);

create index game_events_game_idx on public.game_events (game_id, year, month);

-- ----------------------------------------------------------------------
-- game_scheduled_events: the pending future-event queue, replaced each turn.
-- ----------------------------------------------------------------------
create table public.game_scheduled_events (
  id uuid primary key,
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  due_year integer not null,
  due_month integer not null check (due_month between 1 and 12),
  scheduled_year integer not null,
  scheduled_month integer not null check (scheduled_month between 1 and 12),
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create index game_scheduled_events_game_idx
  on public.game_scheduled_events (game_id, due_year, due_month);

-- ----------------------------------------------------------------------
-- Privileges + row level security: players (guests included) only ever
-- see their own rows. `to authenticated` covers anonymous sessions; the
-- anon (signed-out) role has no access at all.
-- ----------------------------------------------------------------------
grant select, insert, update, delete on public.games to authenticated;
grant select, insert, update, delete on public.game_messages to authenticated;
grant select, insert, update, delete on public.game_events to authenticated;
grant select, insert, update, delete on public.game_scheduled_events to authenticated;

alter table public.games enable row level security;
alter table public.game_messages enable row level security;
alter table public.game_events enable row level security;
alter table public.game_scheduled_events enable row level security;

create policy "Players manage their own games"
  on public.games for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Players manage their own messages"
  on public.game_messages for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Players manage their own events"
  on public.game_events for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Players manage their own scheduled events"
  on public.game_scheduled_events for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
