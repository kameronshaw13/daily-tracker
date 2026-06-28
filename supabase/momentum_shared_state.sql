create table if not exists public.momentum_challenge_state (
  id text primary key default 'shared',
  app_data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.momentum_challenge_state enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'momentum_challenge_state'
      and policyname = 'Allow shared Momentum reads'
  ) then
    create policy "Allow shared Momentum reads"
      on public.momentum_challenge_state
      for select
      to anon, authenticated
      using (id = 'shared');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'momentum_challenge_state'
      and policyname = 'Allow shared Momentum inserts'
  ) then
    create policy "Allow shared Momentum inserts"
      on public.momentum_challenge_state
      for insert
      to anon, authenticated
      with check (id = 'shared');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'momentum_challenge_state'
      and policyname = 'Allow shared Momentum updates'
  ) then
    create policy "Allow shared Momentum updates"
      on public.momentum_challenge_state
      for update
      to anon, authenticated
      using (id = 'shared')
      with check (id = 'shared');
  end if;
end $$;
