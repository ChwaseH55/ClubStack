-- Add FK from memberships.user_id to public.profiles so PostgREST can
-- resolve the embedded profiles join in membership queries.
alter table public.memberships
  add constraint memberships_user_profile_fk
  foreign key (user_id) references public.profiles(id);
