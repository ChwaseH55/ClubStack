-- The cross-table EXISTS subquery in storage RLS is unreliable.
-- Switch to the same pattern that works for avatars: user-prefixed paths
-- so the policy only needs to compare auth.uid() to the first path segment.
-- New path structure: {userId}/{orgId}/logo.ext  (user ID is [1], org ID is [2])

drop policy if exists "org admins upload org assets"  on storage.objects;
drop policy if exists "org admins update org assets"  on storage.objects;
drop policy if exists "org admins delete org assets"  on storage.objects;

create policy "authenticated upload org assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'org-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "authenticated update org assets"
  on storage.objects for update to authenticated
  using  (bucket_id = 'org-assets' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'org-assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "authenticated delete org assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'org-assets' and auth.uid()::text = (storage.foldername(name))[1]);
