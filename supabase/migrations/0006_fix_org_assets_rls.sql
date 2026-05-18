-- Replace org-assets storage policies: use inline subquery instead of
-- is_admin() helper, which is unreliable in the storage RLS context.

drop policy if exists "org admins upload org assets"  on storage.objects;
drop policy if exists "org admins update org assets"  on storage.objects;
drop policy if exists "org admins delete org assets"  on storage.objects;

create policy "org admins upload org assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'org-assets'
    and exists (
      select 1 from public.memberships
      where org_id  = (storage.foldername(name))[1]::uuid
        and user_id = auth.uid()
        and role    in ('owner', 'admin')
        and status  = 'active'
    )
  );

create policy "org admins update org assets"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'org-assets'
    and exists (
      select 1 from public.memberships
      where org_id  = (storage.foldername(name))[1]::uuid
        and user_id = auth.uid()
        and role    in ('owner', 'admin')
        and status  = 'active'
    )
  )
  with check (
    bucket_id = 'org-assets'
    and exists (
      select 1 from public.memberships
      where org_id  = (storage.foldername(name))[1]::uuid
        and user_id = auth.uid()
        and role    in ('owner', 'admin')
        and status  = 'active'
    )
  );

create policy "org admins delete org assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'org-assets'
    and exists (
      select 1 from public.memberships
      where org_id  = (storage.foldername(name))[1]::uuid
        and user_id = auth.uid()
        and role    in ('owner', 'admin')
        and status  = 'active'
    )
  );
