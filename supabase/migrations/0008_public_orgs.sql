-- Public org flag
alter table public.organizations
  add column if not exists is_public boolean not null default false;

-- Anyone can read public orgs (for the /club/:slug page)
do $$ begin
  create policy "anyone can view public orgs"
    on public.organizations for select to anon
    using (is_public = true);
exception when duplicate_object then null;
end $$;

-- Anyone can read profiles of featured leaders in public orgs
do $$ begin
  create policy "anyone can view public org leader profiles"
    on public.profiles for select to anon
    using (
      exists (
        select 1
        from public.memberships m
        join public.organizations o on o.id = m.org_id
        where m.user_id = profiles.id
          and m.title   is not null
          and m.status  = 'active'
          and o.is_public = true
      )
    );
exception when duplicate_object then null;
end $$;

-- Anyone can read leadership memberships for public orgs
do $$ begin
  create policy "anyone can view public org leadership"
    on public.memberships for select to anon
    using (
      title is not null
      and status = 'active'
      and exists (
        select 1 from public.organizations
        where id = org_id and is_public = true
      )
    );
exception when duplicate_object then null;
end $$;

-- Authenticated users can request to join a public org they are not yet in
do $$ begin
  create policy "users can request to join public orgs"
    on public.memberships for insert to authenticated
    with check (
      user_id = auth.uid()
      and status  = 'requested'
      and exists (
        select 1 from public.organizations
        where id = org_id and is_public = true
      )
      and not exists (
        select 1 from public.memberships existing
        where existing.org_id  = org_id
          and existing.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

-- Admins can update org is_public (covered by existing "admins update org" policy)
-- Admins can delete (reject) join requests (covered by existing membership delete policies)
