-- ── Invite links ────────────────────────────────────────────────────────────
create table if not exists public.invite_links (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  token      text unique not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz default now(),
  expires_at timestamptz,
  max_uses   int,
  uses_count int not null default 0,
  active     boolean not null default true
);
alter table public.invite_links enable row level security;

create policy "admins manage invite links" on public.invite_links
  for all to authenticated using (is_admin(org_id)) with check (is_admin(org_id));

-- Anyone can read an invite link by token (needed to resolve it before auth)
create policy "anyone can look up invite link" on public.invite_links
  for select to anon, authenticated using (active = true);

-- ── Notifications ────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  org_id     uuid references public.organizations(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;

create policy "own notifications" on public.notifications
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime
alter publication supabase_realtime add table public.notifications;

-- ── Trigger: notify members on new announcement ──────────────────────────────
create or replace function public.notify_on_announcement()
returns trigger language plpgsql security definer as $$
declare
  org_slug text;
begin
  select slug into org_slug from public.organizations where id = new.org_id;
  insert into public.notifications (user_id, org_id, type, title, body, link)
  select
    m.user_id,
    new.org_id,
    'announcement',
    new.title,
    left(new.body, 120),
    '/orgs/' || org_slug || '/announcements/' || new.id
  from public.memberships m
  where m.org_id = new.org_id
    and m.status = 'active'
    and m.user_id != new.author_id;
  return new;
end $$;

create trigger on_announcement_created
  after insert on public.announcements
  for each row execute function public.notify_on_announcement();

-- ── Trigger: notify members on new event ─────────────────────────────────────
create or replace function public.notify_on_event()
returns trigger language plpgsql security definer as $$
declare
  org_slug text;
  creator  uuid;
begin
  select slug into org_slug from public.organizations where id = new.org_id;
  creator := coalesce(new.author_id, new.created_by);
  insert into public.notifications (user_id, org_id, type, title, body, link)
  select
    m.user_id,
    new.org_id,
    'event',
    new.title,
    to_char(new.start_at at time zone 'UTC', 'Mon DD, YYYY'),
    '/orgs/' || org_slug || '/events/' || new.id
  from public.memberships m
  where m.org_id = new.org_id
    and m.status = 'active'
    and m.user_id != creator;
  return new;
end $$;

create trigger on_event_created
  after insert on public.events
  for each row execute function public.notify_on_event();

-- ── Trigger: notify thread author on new forum reply ─────────────────────────
create or replace function public.notify_on_forum_reply()
returns trigger language plpgsql security definer as $$
declare
  org_slug  text;
  post_row  public.forum_posts%rowtype;
begin
  select * into post_row from public.forum_posts where id = new.post_id;
  if post_row.author_id = new.author_id then return new; end if;
  select slug into org_slug from public.organizations where id = post_row.org_id;
  insert into public.notifications (user_id, org_id, type, title, body, link)
  values (
    post_row.author_id,
    post_row.org_id,
    'forum_reply',
    'New reply on "' || post_row.title || '"',
    left(new.body, 120),
    '/orgs/' || org_slug || '/forum/' || new.post_id
  );
  return new;
end $$;

create trigger on_forum_reply_created
  after insert on public.forum_comments
  for each row execute function public.notify_on_forum_reply();
