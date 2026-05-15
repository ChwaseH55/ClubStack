-- Add FK constraints from author_id fields to public.profiles
-- so PostgREST can resolve embedded profile joins in queries.
-- These coexist with the existing auth.users FKs.

alter table public.announcements
  add constraint announcements_author_profile_fk
  foreign key (author_id) references public.profiles(id);

alter table public.forum_posts
  add constraint forum_posts_author_profile_fk
  foreign key (author_id) references public.profiles(id);

alter table public.forum_comments
  add constraint forum_comments_author_profile_fk
  foreign key (author_id) references public.profiles(id);

alter table public.chat_messages
  add constraint chat_messages_author_profile_fk
  foreign key (author_id) references public.profiles(id);
