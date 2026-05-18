-- The room creator needs to be able to add other participants when starting
-- a DM or group chat. Previously only admins could insert on behalf of others.
create policy "room creator can add participants"
  on public.chat_participants for insert to authenticated
  with check (
    exists (
      select 1 from public.chat_rooms
      where id = room_id and created_by = auth.uid()
    )
  );
