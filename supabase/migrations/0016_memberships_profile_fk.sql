-- Add FK from memberships.user_id to public.profiles so PostgREST can
-- resolve the embedded profiles join in membership queries.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'memberships_user_profile_fk'
  ) then
    alter table public.memberships
      add constraint memberships_user_profile_fk
      foreign key (user_id) references public.profiles(id);
  end if;
end $$;
