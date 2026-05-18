-- Remove the duplicate auto-named FK on events.author_id so PostgREST
-- has exactly one relationship (events_author_profile_fk) to embed profiles.
alter table public.events
  drop constraint if exists events_author_id_fkey;
