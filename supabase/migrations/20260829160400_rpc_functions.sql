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
