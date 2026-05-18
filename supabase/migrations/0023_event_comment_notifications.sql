-- Notify the event author when someone else comments on their event.
create or replace function public.notify_on_event_comment()
returns trigger language plpgsql security definer as $$
declare
  v_event_title  text;
  v_event_author uuid;
  v_org_id       uuid;
  v_org_slug     text;
begin
  select e.title, e.author_id, e.org_id, o.slug
    into v_event_title, v_event_author, v_org_id, v_org_slug
    from public.events e
    join public.organizations o on o.id = e.org_id
   where e.id = new.event_id;

  -- Don't notify if the commenter is the event author
  if v_event_author = new.author_id then return new; end if;

  insert into public.notifications (user_id, org_id, type, title, body, link)
  values (
    v_event_author,
    v_org_id,
    'event_comment',
    'New comment on "' || v_event_title || '"',
    left(new.body, 120),
    '/orgs/' || v_org_slug || '/events/' || new.event_id
  );
  return new;
end $$;

create trigger on_event_comment_created
  after insert on public.event_comments
  for each row execute function public.notify_on_event_comment();

-- Allow users to delete their own notifications
create policy "users can delete own notifications"
  on public.notifications for delete to authenticated
  using (user_id = auth.uid());
