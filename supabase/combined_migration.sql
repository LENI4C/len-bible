-- Len Bible combined migrations (generated for SQL Editor)
-- Apply in Supabase Dashboard → SQL → New query → Run


-- ========== 20260829160000_extensions_and_types.sql ==========
-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Enums
CREATE TYPE public.report_target_type AS ENUM ('thread', 'reply');


-- ========== 20260829160100_core_tables.sql ==========
-- Profiles (created after username selection; id = auth.users.id)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  avatar text NOT NULL DEFAULT '📖',
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  streak integer NOT NULL DEFAULT 0 CHECK (streak >= 0),
  longest_streak integer NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_read_date date,
  is_moderator boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_length CHECK (char_length(username) BETWEEN 2 AND 20)
);

CREATE UNIQUE INDEX profiles_username_lower_idx ON public.profiles (lower(username));

-- Reading progress
CREATE TABLE public.reading_progress (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id text NOT NULL,
  chapter integer NOT NULL CHECK (chapter > 0),
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id, chapter)
);

CREATE INDEX reading_progress_user_read_at_idx
  ON public.reading_progress (user_id, read_at DESC);

-- Quiz results
CREATE TABLE public.quiz_results (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id text NOT NULL,
  chapter integer NOT NULL CHECK (chapter > 0),
  score integer NOT NULL CHECK (score >= 0),
  total integer NOT NULL CHECK (total > 0),
  passed boolean NOT NULL,
  failed_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  points_earned integer NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id, chapter)
);

-- Pre-generated quiz questions (correct_index never exposed to clients)
CREATE TABLE public.quiz_questions (
  book_id text NOT NULL,
  chapter integer NOT NULL CHECK (chapter > 0),
  question_id integer NOT NULL CHECK (question_id BETWEEN 1 AND 4),
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_index integer NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation text NOT NULL,
  review_verse text NOT NULL,
  PRIMARY KEY (book_id, chapter, question_id),
  CONSTRAINT quiz_questions_options_shape CHECK (
    jsonb_typeof(options) = 'array' AND jsonb_array_length(options) = 4
  )
);

CREATE INDEX quiz_questions_book_chapter_idx
  ON public.quiz_questions (book_id, chapter);

-- Discussion
CREATE TABLE public.discussion_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id text NOT NULL,
  chapter integer NOT NULL CHECK (chapter > 0),
  verse integer CHECK (verse IS NULL OR verse > 0),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) >= 3),
  body text NOT NULL CHECK (char_length(trim(body)) >= 10),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX discussion_threads_book_chapter_idx
  ON public.discussion_threads (book_id, chapter, created_at DESC);

CREATE TABLE public.discussion_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.discussion_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) >= 2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX discussion_replies_thread_idx
  ON public.discussion_replies (thread_id, created_at ASC);

-- Reports (moderator-readable only)
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type public.report_target_type NOT NULL,
  target_id uuid NOT NULL,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(trim(reason)) >= 3),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reports_target_idx ON public.reports (target_type, target_id);


-- ========== 20260829160200_quiz_client_view.sql ==========
-- Client-safe view: excludes correct_index
CREATE OR REPLACE VIEW public.quiz_questions_client AS
SELECT
  book_id,
  chapter,
  question_id,
  question,
  options,
  explanation,
  review_verse
FROM public.quiz_questions;

GRANT SELECT ON public.quiz_questions_client TO authenticated;
GRANT SELECT ON public.quiz_questions_client TO anon;

REVOKE ALL ON public.quiz_questions FROM authenticated;
REVOKE ALL ON public.quiz_questions FROM anon;


-- ========== 20260829160300_rls_policies.sql ==========
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_authenticated
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY profiles_insert_own
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- reading_progress: owner read only; writes via RPC
CREATE POLICY reading_progress_select_own
  ON public.reading_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- quiz_results: owner read only; writes via RPC
CREATE POLICY quiz_results_select_own
  ON public.quiz_results FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- quiz_questions: no client access (view + RPC only)
CREATE POLICY quiz_questions_deny_all
  ON public.quiz_questions FOR ALL TO authenticated
  USING (false);

CREATE POLICY quiz_questions_deny_anon
  ON public.quiz_questions FOR ALL TO anon
  USING (false);

-- discussion_threads
CREATE POLICY discussion_threads_select
  ON public.discussion_threads FOR SELECT TO authenticated
  USING (true);

CREATE POLICY discussion_threads_insert
  ON public.discussion_threads FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY discussion_threads_update_own
  ON public.discussion_threads FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY discussion_threads_delete_own
  ON public.discussion_threads FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- discussion_replies
CREATE POLICY discussion_replies_select
  ON public.discussion_replies FOR SELECT TO authenticated
  USING (true);

CREATE POLICY discussion_replies_insert
  ON public.discussion_replies FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY discussion_replies_update_own
  ON public.discussion_replies FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY discussion_replies_delete_own
  ON public.discussion_replies FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- reports
CREATE POLICY reports_insert_own
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY reports_select_moderator
  ON public.reports FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_moderator = true
    )
  );


-- ========== 20260829160400_rpc_functions.sql ==========
-- Constants mirrored from src/lib/points.ts
-- CHAPTER_READ = 10, QUIZ_PASS = 25, QUIZ_PERFECT = 15
-- STREAK_BONUS_PER_DAY = 2, STREAK_BONUS_CAP = 20
-- PASS_THRESHOLD = 0.7

CREATE OR REPLACE FUNCTION public._streak_bonus(streak_days integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEAST(streak_days * 2, 20);
$$;

CREATE OR REPLACE FUNCTION public._quiz_points(p_score integer, p_total integer, p_passed boolean)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF NOT p_passed THEN
    RETURN 0;
  END IF;
  IF p_score = p_total THEN
    RETURN 25 + 15;
  END IF;
  RETURN 25;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_chapter_read(p_book_id text, p_chapter integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := (timezone('UTC', now()))::date;
  v_yesterday date := v_today - 1;
  v_profile public.profiles%ROWTYPE;
  v_streak integer;
  v_bonus integer;
  v_earned integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.reading_progress
    WHERE user_id = v_user_id AND book_id = p_book_id AND chapter = p_chapter
  ) THEN
    RETURN jsonb_build_object('points_earned', 0, 'already_read', true);
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  INSERT INTO public.reading_progress (user_id, book_id, chapter)
  VALUES (v_user_id, p_book_id, p_chapter);

  IF v_profile.last_read_date = v_today THEN
    v_streak := v_profile.streak;
  ELSIF v_profile.last_read_date = v_yesterday THEN
    v_streak := v_profile.streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  v_bonus := public._streak_bonus(v_streak);
  v_earned := 10 + v_bonus;

  UPDATE public.profiles
  SET
    streak = v_streak,
    longest_streak = GREATEST(longest_streak, v_streak),
    last_read_date = v_today,
    points = points + v_earned
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'points_earned', v_earned,
    'already_read', false,
    'streak', v_streak,
    'points_total', v_profile.points + v_earned
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_quiz_answers(
  p_book_id text,
  p_chapter integer,
  p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_prev public.quiz_results%ROWTYPE;
  v_answer jsonb;
  v_question_id integer;
  v_selected integer;
  v_correct integer;
  v_score integer := 0;
  v_total integer := 0;
  v_passed boolean;
  v_points integer;
  v_prev_points integer := 0;
  v_delta integer;
  v_failed jsonb := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.quiz_questions
  WHERE book_id = p_book_id AND chapter = p_chapter;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'quiz_not_found';
  END IF;

  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    v_question_id := (v_answer->>'question_id')::integer;
    v_selected := (v_answer->>'selected_index')::integer;

    SELECT correct_index INTO v_correct
    FROM public.quiz_questions
    WHERE book_id = p_book_id AND chapter = p_chapter AND question_id = v_question_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'invalid_question_id';
    END IF;

    IF v_selected = v_correct THEN
      v_score := v_score + 1;
    ELSE
      v_failed := v_failed || to_jsonb(v_question_id);
    END IF;
  END LOOP;

  v_passed := (v_score::numeric / v_total::numeric) >= 0.7;
  v_points := public._quiz_points(v_score, v_total, v_passed);

  SELECT * INTO v_prev
  FROM public.quiz_results
  WHERE user_id = v_user_id AND book_id = p_book_id AND chapter = p_chapter;

  IF FOUND THEN
    v_prev_points := v_prev.points_earned;
  END IF;

  v_delta := GREATEST(0, v_points - v_prev_points);

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  INSERT INTO public.quiz_results (
    user_id, book_id, chapter, score, total, passed,
    failed_questions, points_earned, completed_at
  )
  VALUES (
    v_user_id, p_book_id, p_chapter, v_score, v_total, v_passed,
    v_failed, v_points, now()
  )
  ON CONFLICT (user_id, book_id, chapter) DO UPDATE SET
    score = EXCLUDED.score,
    total = EXCLUDED.total,
    passed = EXCLUDED.passed,
    failed_questions = EXCLUDED.failed_questions,
    points_earned = EXCLUDED.points_earned,
    completed_at = EXCLUDED.completed_at;

  IF v_delta > 0 THEN
    UPDATE public.profiles SET points = points + v_delta WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'score', v_score,
    'total', v_total,
    'passed', v_passed,
    'failed_question_ids', v_failed,
    'points_earned', v_points,
    'points_delta', v_delta,
    'points_total', v_profile.points + v_delta
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(username) = lower(trim(p_username))
  );
$$;

GRANT EXECUTE ON FUNCTION public.mark_chapter_read(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_answers(text, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO authenticated;


-- ========== 20260829160500_fix_quiz_client_view.sql ==========
-- Fix: security_invoker=true caused RLS deny on quiz_questions to block the view.
-- Run as view owner (default) so authenticated users can read client-safe columns only.
CREATE OR REPLACE VIEW public.quiz_questions_client AS
SELECT
  book_id,
  chapter,
  question_id,
  question,
  options,
  explanation,
  review_verse
FROM public.quiz_questions;

GRANT SELECT ON public.quiz_questions_client TO authenticated;
GRANT SELECT ON public.quiz_questions_client TO anon;


-- ========== 20260829160500_rate_limits.sql ==========
-- Discussion rate limit: max 5 posts per user per 60 seconds
CREATE OR REPLACE FUNCTION public.check_discussion_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_author uuid;
BEGIN
  IF TG_TABLE_NAME = 'discussion_threads' THEN
    v_author := NEW.author_id;
    SELECT COUNT(*) INTO v_count
    FROM public.discussion_threads
    WHERE author_id = v_author AND created_at > now() - interval '60 seconds';
  ELSE
    v_author := NEW.author_id;
    SELECT COUNT(*) INTO v_count
    FROM public.discussion_replies
    WHERE author_id = v_author AND created_at > now() - interval '60 seconds';
  END IF;

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING HINT = 'Wait a minute before posting again.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER discussion_threads_rate_limit
  BEFORE INSERT ON public.discussion_threads
  FOR EACH ROW EXECUTE FUNCTION public.check_discussion_rate_limit();

CREATE TRIGGER discussion_replies_rate_limit
  BEFORE INSERT ON public.discussion_replies
  FOR EACH ROW EXECUTE FUNCTION public.check_discussion_rate_limit();


-- ========== 20260829160600_realtime.sql ==========
-- Realtime for leaderboard and discussion
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_replies;


-- ========== 20260829160700_leaderboard_rpc.sql ==========
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


-- ========== 20261020180000_quiz_integrity_and_loop.sql ==========
-- Phase 0: strip pre-submit leaks; streak/mastery on quiz pass; client-local date for streaks

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_goal_met_date date,
  ADD COLUMN IF NOT EXISTS streak_freezes integer NOT NULL DEFAULT 1 CHECK (streak_freezes >= 0),
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

CREATE OR REPLACE VIEW public.quiz_questions_client AS
SELECT
  book_id,
  chapter,
  question_id,
  question,
  options
FROM public.quiz_questions;

GRANT SELECT ON public.quiz_questions_client TO authenticated;
GRANT SELECT ON public.quiz_questions_client TO anon;

-- Reading awards points only (no streak). Streak advances on quiz pass.
CREATE OR REPLACE FUNCTION public.mark_chapter_read(p_book_id text, p_chapter integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_earned integer := 10;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.reading_progress
    WHERE user_id = v_user_id AND book_id = p_book_id AND chapter = p_chapter
  ) THEN
    RETURN jsonb_build_object('points_earned', 0, 'already_read', true);
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  INSERT INTO public.reading_progress (user_id, book_id, chapter)
  VALUES (v_user_id, p_book_id, p_chapter);

  UPDATE public.profiles
  SET points = points + v_earned
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'points_earned', v_earned,
    'already_read', false,
    'streak', v_profile.streak,
    'points_total', v_profile.points + v_earned
  );
END;
$$;

-- Quiz submit: grade, streak on pass (client local date), return review payload for misses
CREATE OR REPLACE FUNCTION public.submit_quiz_answers(
  p_book_id text,
  p_chapter integer,
  p_answers jsonb,
  p_local_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_prev public.quiz_results%ROWTYPE;
  v_answer jsonb;
  v_question_id integer;
  v_selected integer;
  v_correct integer;
  v_score integer := 0;
  v_total integer := 0;
  v_passed boolean;
  v_points integer;
  v_prev_points integer := 0;
  v_delta integer;
  v_failed jsonb := '[]'::jsonb;
  v_today date := COALESCE(p_local_date, (timezone('UTC', now()))::date);
  v_yesterday date := v_today - 1;
  v_streak integer;
  v_bonus integer := 0;
  v_review jsonb := '[]'::jsonb;
  v_q record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.quiz_questions
  WHERE book_id = p_book_id AND chapter = p_chapter;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'quiz_not_found';
  END IF;

  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    v_question_id := (v_answer->>'question_id')::integer;
    v_selected := (v_answer->>'selected_index')::integer;

    SELECT correct_index INTO v_correct
    FROM public.quiz_questions
    WHERE book_id = p_book_id AND chapter = p_chapter AND question_id = v_question_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'invalid_question_id';
    END IF;

    IF v_selected = v_correct THEN
      v_score := v_score + 1;
    ELSE
      v_failed := v_failed || to_jsonb(v_question_id);
    END IF;
  END LOOP;

  v_passed := (v_score::numeric / v_total::numeric) >= 0.7;
  v_points := public._quiz_points(v_score, v_total, v_passed);

  SELECT * INTO v_prev
  FROM public.quiz_results
  WHERE user_id = v_user_id AND book_id = p_book_id AND chapter = p_chapter;

  IF FOUND THEN
    v_prev_points := v_prev.points_earned;
  END IF;

  v_delta := GREATEST(0, v_points - v_prev_points);

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  INSERT INTO public.quiz_results (
    user_id, book_id, chapter, score, total, passed,
    failed_questions, points_earned, completed_at
  )
  VALUES (
    v_user_id, p_book_id, p_chapter, v_score, v_total, v_passed,
    v_failed, v_points, now()
  )
  ON CONFLICT (user_id, book_id, chapter) DO UPDATE SET
    score = EXCLUDED.score,
    total = EXCLUDED.total,
    passed = EXCLUDED.passed,
    failed_questions = EXCLUDED.failed_questions,
    points_earned = EXCLUDED.points_earned,
    completed_at = EXCLUDED.completed_at;

  -- Streak + bonus only when this attempt passes and day not already counted
  IF v_passed THEN
    IF v_profile.last_read_date = v_today THEN
      v_streak := v_profile.streak;
    ELSIF v_profile.last_read_date = v_yesterday THEN
      v_streak := v_profile.streak + 1;
      v_bonus := public._streak_bonus(v_streak);
    ELSE
      v_streak := 1;
      v_bonus := public._streak_bonus(v_streak);
    END IF;

    UPDATE public.profiles
    SET
      streak = v_streak,
      longest_streak = GREATEST(longest_streak, v_streak),
      last_read_date = v_today,
      points = points + v_delta + v_bonus,
      daily_goal_met_date = v_today
    WHERE id = v_user_id;
  ELSE
    v_streak := v_profile.streak;
    IF v_delta > 0 THEN
      UPDATE public.profiles SET points = points + v_delta WHERE id = v_user_id;
    END IF;
  END IF;

  -- Review payload for failed (and all) questions after submit
  FOR v_q IN
    SELECT question_id, question, options, correct_index, explanation, review_verse
    FROM public.quiz_questions
    WHERE book_id = p_book_id AND chapter = p_chapter
    ORDER BY question_id
  LOOP
    v_review := v_review || jsonb_build_object(
      'question_id', v_q.question_id,
      'question', v_q.question,
      'options', v_q.options,
      'correct_index', v_q.correct_index,
      'explanation', v_q.explanation,
      'review_verse', v_q.review_verse
    );
  END LOOP;

  RETURN jsonb_build_object(
    'score', v_score,
    'total', v_total,
    'passed', v_passed,
    'failed_question_ids', v_failed,
    'points_earned', v_points,
    'points_delta', v_delta,
    'streak_bonus', v_bonus,
    'streak', v_streak,
    'points_total', v_profile.points + v_delta + v_bonus,
    'review', v_review
  );
END;
$$;

-- Review after the user has attempted the quiz
CREATE OR REPLACE FUNCTION public.get_quiz_review(p_book_id text, p_chapter integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result public.quiz_results%ROWTYPE;
  v_review jsonb := '[]'::jsonb;
  v_q record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_result
  FROM public.quiz_results
  WHERE user_id = v_user_id AND book_id = p_book_id AND chapter = p_chapter;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'quiz_not_attempted';
  END IF;

  FOR v_q IN
    SELECT question_id, question, options, correct_index, explanation, review_verse
    FROM public.quiz_questions
    WHERE book_id = p_book_id AND chapter = p_chapter
    ORDER BY question_id
  LOOP
    v_review := v_review || jsonb_build_object(
      'question_id', v_q.question_id,
      'question', v_q.question,
      'options', v_q.options,
      'correct_index', v_q.correct_index,
      'explanation', v_q.explanation,
      'review_verse', v_q.review_verse
    );
  END LOOP;

  RETURN jsonb_build_object(
    'failed_question_ids', v_result.failed_questions,
    'passed', v_result.passed,
    'score', v_result.score,
    'total', v_result.total,
    'questions', v_review
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_quiz_review(text, integer) TO authenticated;

-- Replace 3-arg overload if present
DROP FUNCTION IF EXISTS public.submit_quiz_answers(text, integer, jsonb);

GRANT EXECUTE ON FUNCTION public.submit_quiz_answers(text, integer, jsonb, date) TO authenticated;


-- ========== 20261020180100_retention_badges_rank.sql ==========
-- Phase 1: badges, streak freeze, leaderboard rank

CREATE TABLE IF NOT EXISTS public.badges (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT '🏅'
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id text NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

INSERT INTO public.badges (id, title, description, icon) VALUES
  ('first_chapter', 'First Steps', 'Read your first chapter', '🌱'),
  ('first_quiz', 'Checked Understanding', 'Pass your first quiz', '✅'),
  ('streak_7', 'Week of Faith', 'Maintain a 7-day streak', '🔥'),
  ('streak_30', 'Faithful Month', 'Maintain a 30-day streak', '🗓️'),
  ('book_complete', 'Book Finished', 'Read every chapter in a book', '📚'),
  ('perfect_quiz', 'Perfect Recall', 'Score 100% on a quiz', '💎'),
  ('chrono_10', 'Story Begins', 'Pass quizzes on 10 chronological chapters', '🗺️')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS badges_select_all ON public.badges;
CREATE POLICY badges_select_all ON public.badges
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS user_badges_select_own ON public.user_badges;
CREATE POLICY user_badges_select_own ON public.user_badges
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.badges TO authenticated;
GRANT SELECT ON public.user_badges TO authenticated;

CREATE OR REPLACE FUNCTION public._award_badge(p_user_id uuid, p_badge_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_badges (user_id, badge_id)
  VALUES (p_user_id, p_badge_id)
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.use_streak_freeze(p_local_date date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_today date := COALESCE(p_local_date, (timezone('UTC', now()))::date);
  v_yesterday date := v_today - 1;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF v_profile.streak_freezes < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_freezes');
  END IF;

  IF v_profile.last_read_date = v_today OR v_profile.last_read_date = v_yesterday THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_needed');
  END IF;

  UPDATE public.profiles
  SET
    streak_freezes = streak_freezes - 1,
    last_read_date = v_yesterday
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'streak_freezes', v_profile.streak_freezes - 1,
    'streak', v_profile.streak
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_streak_freeze(date) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_rank()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_points integer;
  v_rank bigint;
  v_total bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT points INTO v_points FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  SELECT COUNT(*) + 1 INTO v_rank
  FROM public.profiles
  WHERE points > v_points;

  SELECT COUNT(*) INTO v_total FROM public.profiles;

  RETURN jsonb_build_object(
    'rank', v_rank,
    'total', v_total,
    'points', v_points
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_rank() TO authenticated;

-- Hook badge awards into quiz submit via trigger on quiz_results
CREATE OR REPLACE FUNCTION public.trg_quiz_results_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak integer;
  v_passed_count integer;
BEGIN
  IF NEW.passed THEN
    PERFORM public._award_badge(NEW.user_id, 'first_quiz');
    IF NEW.score = NEW.total THEN
      PERFORM public._award_badge(NEW.user_id, 'perfect_quiz');
    END IF;

    SELECT streak INTO v_streak FROM public.profiles WHERE id = NEW.user_id;
    IF v_streak >= 7 THEN
      PERFORM public._award_badge(NEW.user_id, 'streak_7');
    END IF;
    IF v_streak >= 30 THEN
      PERFORM public._award_badge(NEW.user_id, 'streak_30');
    END IF;

    SELECT COUNT(*) INTO v_passed_count
    FROM public.quiz_results
    WHERE user_id = NEW.user_id AND passed = true;
    IF v_passed_count >= 10 THEN
      PERFORM public._award_badge(NEW.user_id, 'chrono_10');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quiz_results_badges ON public.quiz_results;
CREATE TRIGGER quiz_results_badges
  AFTER INSERT OR UPDATE ON public.quiz_results
  FOR EACH ROW EXECUTE FUNCTION public.trg_quiz_results_badges();

CREATE OR REPLACE FUNCTION public.trg_reading_progress_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._award_badge(NEW.user_id, 'first_chapter');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reading_progress_badges ON public.reading_progress;
CREATE TRIGGER reading_progress_badges
  AFTER INSERT ON public.reading_progress
  FOR EACH ROW EXECUTE FUNCTION public.trg_reading_progress_badges();

