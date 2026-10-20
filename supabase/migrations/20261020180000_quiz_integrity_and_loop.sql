-- Phase 0: strip pre-submit leaks; streak/mastery on quiz pass; client-local date for streaks

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_goal_met_date date,
  ADD COLUMN IF NOT EXISTS streak_freezes integer NOT NULL DEFAULT 1 CHECK (streak_freezes >= 0),
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

-- REPLACE cannot drop columns; recreate the client-safe view without answer leakage
DROP VIEW IF EXISTS public.quiz_questions_client;
CREATE VIEW public.quiz_questions_client AS
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
