-- Allow 'requested' as a valid membership status for public org join requests
alter table public.memberships
  drop constraint if exists memberships_status_check;

alter table public.memberships
  add constraint memberships_status_check
  check (status in ('invited', 'active', 'suspended', 'requested'));
