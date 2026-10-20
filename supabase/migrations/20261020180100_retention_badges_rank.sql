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
