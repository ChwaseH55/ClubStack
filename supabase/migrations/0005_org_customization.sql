-- Leadership fields on memberships
alter table public.memberships
  add column if not exists title text,
  add column if not exists bio   text;

-- FK from memberships.user_id to public.profiles for PostgREST joins
alter table public.memberships
  add constraint memberships_user_profile_fk
  foreign key (user_id) references public.profiles(id);

-- Admins can update membership records in their org (title, bio, role)
do $$ begin
  create policy "admins update memberships"
    on public.memberships for update to authenticated
    using  (is_admin(org_id))
    with check (is_admin(org_id));
exception when duplicate_object then null;
end $$;

-- Admins can update their org record (branding, settings)
do $$ begin
  create policy "admins update org"
    on public.organizations for update to authenticated
    using  (is_admin(id))
    with check (is_admin(id));
exception when duplicate_object then null;
end $$;

-- Org assets storage bucket (logos, banners)
insert into storage.buckets (id, name, public)
  values ('org-assets', 'org-assets', true)
  on conflict (id) do nothing;

do $$ begin
  create policy "org admins upload org assets"
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'org-assets'
      and is_admin((storage.foldername(name))[1]::uuid)
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "org admins update org assets"
    on storage.objects for update to authenticated
    using  (bucket_id = 'org-assets' and is_admin((storage.foldername(name))[1]::uuid))
    with check (bucket_id = 'org-assets' and is_admin((storage.foldername(name))[1]::uuid));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "org admins delete org assets"
    on storage.objects for delete to authenticated
    using (bucket_id = 'org-assets' and is_admin((storage.foldername(name))[1]::uuid));
exception when duplicate_object then null;
end $$;
