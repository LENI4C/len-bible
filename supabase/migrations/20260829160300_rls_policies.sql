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
