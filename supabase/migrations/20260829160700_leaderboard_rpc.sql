-- Leaderboard RPC: aggregates stats across users (bypasses per-user RLS safely)
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  username text,
  avatar text,
  points integer,
  streak integer,
  chapters_read bigint,
  quizzes_passed bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id,
    p.username,
    p.avatar,
    p.points,
    p.streak,
    (SELECT COUNT(*) FROM public.reading_progress rp WHERE rp.user_id = p.id) AS chapters_read,
    (SELECT COUNT(*) FROM public.quiz_results qr WHERE qr.user_id = p.id AND qr.passed = true) AS quizzes_passed
  FROM public.profiles p
  ORDER BY p.points DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;
