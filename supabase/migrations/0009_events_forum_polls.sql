-- ── Extend events ──────────────────────────────────────────────────────────────
alter table public.events
  add column if not exists description text,
  add column if not exists end_at      timestamptz,
  add column if not exists author_id   uuid references public.profiles(id),
  add column if not exists max_capacity int;

-- FK so PostgREST can resolve profiles!author_id
do $$ begin
  alter table public.events
    add constraint events_author_profile_fk
    foreign key (author_id) references public.profiles(id);
exception when duplicate_object then null;
end $$;

-- Events RLS
do $$ begin
  create policy "members read events"
    on public.events for select to authenticated
    using (is_member(org_id));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "admins manage events"
    on public.events for insert to authenticated
    with check (is_admin(org_id));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "admins update events"
    on public.events for update to authenticated
    using (is_admin(org_id)) with check (is_admin(org_id));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "admins delete events"
    on public.events for delete to authenticated
    using (is_admin(org_id));
exception when duplicate_object then null;
end $$;

-- ── Event RSVPs ─────────────────────────────────────────────────────────────────
create table if not exists public.event_rsvps (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  status     text not null check (status in ('going','maybe','not_going')),
  created_at timestamptz default now(),
  unique(event_id, user_id)
);
alter table public.event_rsvps enable row level security;

create policy "members read rsvps" on public.event_rsvps
  for select to authenticated using (
    exists (
      select 1 from public.events e
      join public.memberships m on m.org_id = e.org_id
      where e.id = event_id and m.user_id = auth.uid() and m.status = 'active'
    )
  );
create policy "members insert rsvp" on public.event_rsvps
  for insert to authenticated with check (user_id = auth.uid());
create policy "members update rsvp" on public.event_rsvps
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members delete rsvp" on public.event_rsvps
  for delete to authenticated using (user_id = auth.uid());

-- ── Event comments ──────────────────────────────────────────────────────────────
create table if not exists public.event_comments (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  author_id  uuid not null references public.profiles(id),
  body       text not null,
  created_at timestamptz default now()
);
alter table public.event_comments enable row level security;

create policy "members read event comments" on public.event_comments
  for select to authenticated using (
    exists (
      select 1 from public.events e
      join public.memberships m on m.org_id = e.org_id
      where e.id = event_id and m.user_id = auth.uid() and m.status = 'active'
    )
  );
create policy "members add event comment" on public.event_comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.events e
      join public.memberships m on m.org_id = e.org_id
      where e.id = event_id and m.user_id = auth.uid() and m.status = 'active'
    )
  );
create policy "authors or admins delete event comment" on public.event_comments
  for delete to authenticated using (
    author_id = auth.uid()
    or is_admin((select org_id from public.events where id = event_id))
  );

-- ── Polls ───────────────────────────────────────────────────────────────────────
create table if not exists public.polls (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  author_id       uuid not null references public.profiles(id),
  question        text not null,
  options         jsonb not null default '[]',
  allow_multiple  boolean not null default false,
  ends_at         timestamptz,
  event_id        uuid references public.events(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete cascade,
  created_at      timestamptz default now()
);
alter table public.polls enable row level security;

create policy "members read polls" on public.polls
  for select to authenticated using (is_member(org_id));
create policy "admins create polls" on public.polls
  for insert to authenticated with check (is_admin(org_id));
create policy "admins update polls" on public.polls
  for update to authenticated using (is_admin(org_id)) with check (is_admin(org_id));
create policy "admins delete polls" on public.polls
  for delete to authenticated using (is_admin(org_id));

-- ── Poll votes ──────────────────────────────────────────────────────────────────
create table if not exists public.poll_votes (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references public.polls(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  choices    jsonb not null default '[]',
  created_at timestamptz default now(),
  unique(poll_id, user_id)
);
alter table public.poll_votes enable row level security;

create policy "members read poll votes" on public.poll_votes
  for select to authenticated using (
    exists (select 1 from public.polls where id = poll_id and is_member(org_id))
  );
create policy "members vote" on public.poll_votes
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.polls where id = poll_id and is_member(org_id))
  );
create policy "members change vote" on public.poll_votes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Forum RLS (posts + comments already exist, add policies if missing) ─────────
do $$ begin
  create policy "members read forum posts"
    on public.forum_posts for select to authenticated using (is_member(org_id));
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "members create forum post"
    on public.forum_posts for insert to authenticated
    with check (is_member(org_id) and author_id = auth.uid());
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "authors or admins delete forum post"
    on public.forum_posts for delete to authenticated
    using (author_id = auth.uid() or is_admin(org_id));
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "members read forum comments"
    on public.forum_comments for select to authenticated using (
      exists (select 1 from public.forum_posts where id = post_id and is_member(org_id))
    );
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "members add forum comment"
    on public.forum_comments for insert to authenticated
    with check (
      author_id = auth.uid()
      and exists (select 1 from public.forum_posts where id = post_id and is_member(org_id))
    );
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "authors or admins delete forum comment"
    on public.forum_comments for delete to authenticated
    using (
      author_id = auth.uid()
      or is_admin((select org_id from public.forum_posts where id = post_id))
    );
exception when duplicate_object then null;
end $$;
