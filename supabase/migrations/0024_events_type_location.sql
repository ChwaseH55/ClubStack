alter table public.events
  add column if not exists event_type    text    not null default 'general',
  add column if not exists location      text,
  add column if not exists type_metadata jsonb   not null default '{}';
