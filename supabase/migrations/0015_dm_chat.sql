-- ── Extend chat_rooms for DM/group model ────────────────────────────────────
alter table public.chat_rooms
  add column if not exists is_group  boolean not null default false,
  add column if not exists created_by uuid references public.profiles(id);

-- content is optional when a media file is attached
alter table public.chat_messages
  alter column content drop not null;

-- Media attachments on messages
alter table public.chat_messages
  add column if not exists media_url  text,
  add column if not exists media_type text; -- 'image' | 'video'

-- ── Chat participants ────────────────────────────────────────────────────────
create table if not exists public.chat_participants (
  room_id   uuid not null references public.chat_rooms(id) on delete cascade,
  user_id   uuid not null references public.profiles(id)  on delete cascade,
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);
alter table public.chat_participants enable row level security;

-- Users can see participants of rooms they are in
create policy "participants can see room members"
  on public.chat_participants for select to authenticated
  using (
    exists (
      select 1 from public.chat_participants cp
      where cp.room_id = chat_participants.room_id
        and cp.user_id = auth.uid()
    )
  );

-- Users can insert themselves into a room (when creating)
create policy "users can join rooms"
  on public.chat_participants for insert to authenticated
  with check (user_id = auth.uid());

-- Admins can add others
create policy "admins can add participants"
  on public.chat_participants for insert to authenticated
  with check (
    exists (
      select 1 from public.chat_rooms r
      join public.memberships m on m.org_id = r.org_id
      where r.id = room_id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
        and m.status = 'active'
    )
  );

create policy "participants can leave"
  on public.chat_participants for delete to authenticated
  using (user_id = auth.uid());

-- ── Update chat_rooms RLS to participant-based ───────────────────────────────
drop policy if exists "members read rooms"  on public.chat_rooms;
drop policy if exists "admins manage rooms" on public.chat_rooms;

-- Anyone in the org can create a room (DM or group)
create policy "org members create rooms" on public.chat_rooms
  for insert to authenticated
  with check (is_member(org_id));

-- Users can see rooms they participate in
create policy "participants read rooms" on public.chat_rooms
  for select to authenticated
  using (
    exists (
      select 1 from public.chat_participants
      where room_id = id and user_id = auth.uid()
    )
  );

-- Admins can update/delete rooms
create policy "admins manage rooms" on public.chat_rooms
  for all to authenticated
  using (is_admin(org_id)) with check (is_admin(org_id));

-- ── Update chat_messages RLS to participant-based ────────────────────────────
drop policy if exists "members read messages"    on public.chat_messages;
drop policy if exists "members send messages"    on public.chat_messages;
drop policy if exists "author or admin delete m" on public.chat_messages;

create policy "participants read messages" on public.chat_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.chat_participants
      where room_id = chat_messages.room_id and user_id = auth.uid()
    )
  );

create policy "participants send messages" on public.chat_messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.chat_participants
      where room_id = chat_messages.room_id and user_id = auth.uid()
    )
  );

create policy "author or admin delete message" on public.chat_messages
  for delete to authenticated
  using (
    author_id = auth.uid()
    or is_admin((select org_id from public.chat_rooms where id = room_id))
  );

-- Realtime for participants table (so new group members appear live)
alter publication supabase_realtime add table public.chat_participants;
