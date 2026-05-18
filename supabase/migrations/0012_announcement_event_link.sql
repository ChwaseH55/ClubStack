alter table public.announcements
  add column if not exists event_id uuid references public.events(id) on delete set null;
