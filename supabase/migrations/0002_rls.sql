-- Enable RLS on every table
alter table public.profiles           enable row level security;
alter table public.organizations      enable row level security;
alter table public.memberships        enable row level security;
alter table public.announcements      enable row level security;
alter table public.events             enable row level security;
alter table public.event_registrations enable row level security;
alter table public.forum_posts        enable row level security;
alter table public.forum_comments     enable row level security;
alter table public.chat_rooms         enable row level security;
alter table public.chat_messages      enable row level security;
alter table public.shop_items         enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.dues_plans         enable row level security;

-- Reusable helpers so policies stay readable
create or replace function public.is_member(org uuid)
returns boolean as $$
  select exists (
    select 1 from public.memberships
    where org_id = org
      and user_id = auth.uid()
      and status = 'active'
  );
$$ language sql security definer stable;

create or replace function public.is_admin(org uuid)
returns boolean as $$
  select exists (
    select 1 from public.memberships
    where org_id = org
      and user_id = auth.uid()
      and role in ('owner', 'admin')
      and status = 'active'
  );
$$ language sql security definer stable;

-- Profiles
create policy "own profile read"   on public.profiles for select using (id = auth.uid());
create policy "own profile update" on public.profiles for update using (id = auth.uid());

-- Organizations
create policy "members read org"       on public.organizations for select using (public.is_member(id));
create policy "admins update org"      on public.organizations for update using (public.is_admin(id));
create policy "auth users create org"  on public.organizations for insert with check (auth.uid() is not null);

-- Memberships
create policy "members read memberships"  on public.memberships for select using (public.is_member(org_id));
create policy "admins manage memberships" on public.memberships for all    using (public.is_admin(org_id));
create policy "self insert membership"    on public.memberships for insert with check (user_id = auth.uid());

-- Announcements
create policy "members read announcements"  on public.announcements for select using (public.is_member(org_id));
create policy "admins manage announcements" on public.announcements for all    using (public.is_admin(org_id));

-- Events
create policy "members read events"  on public.events for select using (public.is_member(org_id));
create policy "admins manage events" on public.events for all    using (public.is_admin(org_id));

-- Event registrations
create policy "members read registrations"   on public.event_registrations for select using (public.is_member(org_id));
create policy "members register themselves"  on public.event_registrations for insert with check (public.is_member(org_id) and user_id = auth.uid());
create policy "members cancel own"           on public.event_registrations for update using (user_id = auth.uid());

-- Forum posts
create policy "members read posts"        on public.forum_posts for select using (public.is_member(org_id));
create policy "members create posts"      on public.forum_posts for insert with check (public.is_member(org_id) and author_id = auth.uid());
create policy "author or admin delete"    on public.forum_posts for delete using (author_id = auth.uid() or public.is_admin(org_id));

-- Forum comments
create policy "members read comments"      on public.forum_comments for select using (public.is_member(org_id));
create policy "members create comments"    on public.forum_comments for insert with check (public.is_member(org_id) and author_id = auth.uid());
create policy "author or admin delete c"   on public.forum_comments for delete using (author_id = auth.uid() or public.is_admin(org_id));

-- Chat rooms
create policy "members read rooms"   on public.chat_rooms for select using (public.is_member(org_id));
create policy "admins manage rooms"  on public.chat_rooms for all    using (public.is_admin(org_id));

-- Chat messages
create policy "members read messages"    on public.chat_messages for select using (public.is_member(org_id));
create policy "members send messages"    on public.chat_messages for insert with check (public.is_member(org_id) and author_id = auth.uid());
create policy "author or admin delete m" on public.chat_messages for delete using (author_id = auth.uid() or public.is_admin(org_id));

-- Shop items
create policy "members read active items" on public.shop_items for select using (public.is_member(org_id) and active = true);
create policy "admins manage items"       on public.shop_items for all    using (public.is_admin(org_id));

-- Orders
create policy "own orders read"       on public.orders for select using (user_id = auth.uid());
create policy "admins read all orders" on public.orders for select using (public.is_admin(org_id));
create policy "members place orders"  on public.orders for insert with check (public.is_member(org_id) and user_id = auth.uid());

-- Order items (readable if you own the parent order)
create policy "own order items read" on public.order_items for select
  using (order_id in (select id from public.orders where user_id = auth.uid()));

-- Dues plans
create policy "members read dues plans"  on public.dues_plans for select using (public.is_member(org_id));
create policy "admins manage dues plans" on public.dues_plans for all    using (public.is_admin(org_id));
