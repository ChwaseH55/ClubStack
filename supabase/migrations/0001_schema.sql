create extension if not exists "uuid-ossp";

-- Profile row created automatically on signup (see trigger below)
create table public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  name       text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Auto-create a profile whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.organizations (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  slug             text unique not null,
  branding         jsonb default '{}',
  enabled_features text[] default '{}',
  created_at       timestamptz default now()
);

create table public.memberships (
  id        uuid primary key default uuid_generate_v4(),
  org_id    uuid not null references public.organizations(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null check (role in ('owner', 'admin', 'member')),
  status    text not null check (status in ('invited', 'active', 'suspended')),
  joined_at timestamptz default now(),
  unique (org_id, user_id)
);

create table public.announcements (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  title      text not null,
  body       text not null,
  author_id  uuid not null references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.events (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  title       text not null,
  description text,
  location    text,
  start_at    timestamptz not null,
  end_at      timestamptz,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz default now()
);

create table public.event_registrations (
  id       uuid primary key default uuid_generate_v4(),
  org_id   uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  user_id  uuid not null references auth.users(id),
  status   text not null check (status in ('registered', 'cancelled')),
  unique (event_id, user_id)
);

create table public.forum_posts (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  title      text not null,
  body       text not null,
  author_id  uuid not null references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.forum_comments (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  post_id    uuid not null references public.forum_posts(id) on delete cascade,
  author_id  uuid not null references auth.users(id),
  body       text not null,
  created_at timestamptz default now()
);

create table public.chat_rooms (
  id     uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name   text not null
);

create table public.chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  room_id    uuid not null references public.chat_rooms(id) on delete cascade,
  author_id  uuid not null references auth.users(id),
  content    text not null,
  created_at timestamptz default now()
);

create table public.shop_items (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  description text,
  price       numeric(10,2) not null,
  active      boolean default true,
  image_url   text,
  created_at  timestamptz default now()
);

create table public.orders (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id),
  total      numeric(10,2) not null,
  status     text not null check (status in ('pending', 'paid', 'refunded')),
  created_at timestamptz default now()
);

create table public.order_items (
  id                uuid primary key default uuid_generate_v4(),
  order_id          uuid not null references public.orders(id) on delete cascade,
  item_id           uuid not null references public.shop_items(id),
  quantity          integer not null default 1,
  price_at_purchase numeric(10,2) not null
);

create table public.dues_plans (
  id     uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name   text not null,
  price  numeric(10,2) not null,
  active boolean default true
);
