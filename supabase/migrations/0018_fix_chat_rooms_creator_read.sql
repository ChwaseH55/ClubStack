-- The chat_rooms INSERT ... SELECT fails because the select policy requires
-- the user to already be in chat_participants, but participants haven't been
-- inserted yet at that point. Allow the creator to read their own room too.

drop policy if exists "participants read rooms" on public.chat_rooms;

create policy "participants or creator read rooms" on public.chat_rooms
  for select to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.chat_participants
      where room_id = id and user_id = auth.uid()
    )
  );
