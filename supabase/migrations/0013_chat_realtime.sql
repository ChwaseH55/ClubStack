-- Enable Realtime for chat_messages so live subscriptions work
alter publication supabase_realtime add table public.chat_messages;
