-- DM chat rooms have no name (name is derived from participants in the UI).
alter table public.chat_rooms alter column name drop not null;
