create table if not exists public.tournament_participants (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  score         numeric(7, 2),
  result_note   text,
  registered_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.tournament_participants enable row level security;

-- Members of the org can read participants for their org's events
create policy "members read tournament participants"
  on public.tournament_participants for select to authenticated
  using (
    exists (
      select 1 from public.events e
      join public.memberships m on m.org_id = e.org_id
      where e.id = event_id and m.user_id = auth.uid() and m.status = 'active'
    )
  );

-- Members can register themselves
create policy "members register themselves"
  on public.tournament_participants for insert to authenticated
  with check (user_id = auth.uid());

-- Members can remove their own registration
create policy "members unregister themselves"
  on public.tournament_participants for delete to authenticated
  using (user_id = auth.uid());

-- Admins can update scores and result notes
create policy "admins update participant scores"
  on public.tournament_participants for update to authenticated
  using (
    exists (
      select 1 from public.events e
      join public.memberships m on m.org_id = e.org_id
      where e.id = event_id and m.user_id = auth.uid()
        and m.status = 'active' and m.role = 'admin'
    )
  );
