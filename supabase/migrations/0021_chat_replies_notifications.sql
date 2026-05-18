-- ── Reply threading ──────────────────────────────────────────────────────────
alter table public.chat_messages
  add column if not exists reply_to_id uuid,
  add constraint chat_messages_reply_fk
    foreign key (reply_to_id) references public.chat_messages(id) on delete set null;

-- ── Let room creator delete their own rooms ──────────────────────────────────
create policy "creator can delete room" on public.chat_rooms
  for delete to authenticated
  using (created_by = auth.uid());

-- ── Chat message notifications ───────────────────────────────────────────────
create or replace function public.notify_on_chat_message()
returns trigger language plpgsql security definer as $$
declare
  v_sender_name  text;
  v_org_slug     text;
  v_org_id       uuid;
  v_body         text;
  v_participant  record;
begin
  -- Get sender name
  select name into v_sender_name from public.profiles where id = NEW.author_id;

  -- Get org_id and slug
  select r.org_id, o.slug
    into v_org_id, v_org_slug
    from public.chat_rooms r
    join public.organizations o on o.id = r.org_id
   where r.id = NEW.room_id;

  -- Build body preview (truncate long messages)
  v_body := case
    when NEW.media_type = 'image' then '📷 Photo'
    when NEW.media_type = 'video' then '🎥 Video'
    else left(coalesce(NEW.content, ''), 80)
  end;

  -- Notify every participant except the sender
  for v_participant in
    select user_id from public.chat_participants
     where room_id = NEW.room_id and user_id <> NEW.author_id
  loop
    insert into public.notifications (user_id, org_id, type, title, body, link)
    values (
      v_participant.user_id,
      v_org_id,
      'chat_message',
      v_sender_name || ' sent you a message',
      v_body,
      '/orgs/' || v_org_slug || '/chat'
    );
  end loop;

  return NEW;
end;
$$;

create trigger on_chat_message_insert
  after insert on public.chat_messages
  for each row execute procedure public.notify_on_chat_message();
