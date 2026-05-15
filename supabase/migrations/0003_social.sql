-- Allow users to read their own memberships regardless of status (needed for invite flow)
create policy "read own memberships"
  on public.memberships for select
  using (user_id = auth.uid());

-- Allow users to accept their own invites
create policy "accept own invite"
  on public.memberships for update
  using (user_id = auth.uid());

-- Allow users to leave an org or decline an invite
create policy "leave or decline"
  on public.memberships for delete
  using (user_id = auth.uid());

-- Allow co-members to see each other's profiles (needed for friends/people search)
create policy "co-members read profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.memberships m1
      join public.memberships m2 on m1.org_id = m2.org_id
      where m1.user_id = auth.uid()
        and m2.user_id = id
        and m1.status = 'active'
        and m2.status = 'active'
    )
  );

-- Friendships / connections
create table public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz default now(),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "see own friendships"
  on public.friendships for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "send friend request"
  on public.friendships for insert
  with check (requester_id = auth.uid());

create policy "respond to request"
  on public.friendships for update
  using (addressee_id = auth.uid());

create policy "remove friendship"
  on public.friendships for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- Avatar storage bucket
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users upload avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users update avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users delete avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
