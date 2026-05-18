-- ── Reply threading for forum comments ──────────────────────────────────────
alter table public.forum_comments
  add column if not exists reply_to_id uuid,
  add constraint forum_comments_reply_fk
    foreign key (reply_to_id) references public.forum_comments(id) on delete set null;

-- ── Reply threading for event comments ───────────────────────────────────────
alter table public.event_comments
  add column if not exists reply_to_id uuid,
  add constraint event_comments_reply_fk
    foreign key (reply_to_id) references public.event_comments(id) on delete set null;

-- ── Likes for forum comments ──────────────────────────────────────────────────
create table if not exists public.forum_comment_likes (
  id         uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.forum_comments(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (comment_id, user_id)
);
alter table public.forum_comment_likes enable row level security;

create policy "authenticated users can read forum comment likes"
  on public.forum_comment_likes for select to authenticated using (true);

create policy "users manage own forum comment likes"
  on public.forum_comment_likes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Likes for event comments ──────────────────────────────────────────────────
create table if not exists public.event_comment_likes (
  id         uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.event_comments(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (comment_id, user_id)
);
alter table public.event_comment_likes enable row level security;

create policy "authenticated users can read event comment likes"
  on public.event_comment_likes for select to authenticated using (true);

create policy "users manage own event comment likes"
  on public.event_comment_likes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
