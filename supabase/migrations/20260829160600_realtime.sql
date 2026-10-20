-- Realtime for leaderboard and discussion
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_replies;
