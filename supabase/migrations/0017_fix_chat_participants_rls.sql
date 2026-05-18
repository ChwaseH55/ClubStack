-- The "participants can see room members" policy on chat_participants queries
-- chat_participants from within itself, causing infinite recursion (PG code 42P17).
-- Fix: use a SECURITY DEFINER function that bypasses RLS for the membership check.

create or replace function public.is_room_participant(room uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_participants
    where room_id = room and user_id = auth.uid()
  );
$$;

drop policy if exists "participants can see room members" on public.chat_participants;

create policy "participants can see room members"
  on public.chat_participants for select to authenticated
  using (public.is_room_participant(room_id));
