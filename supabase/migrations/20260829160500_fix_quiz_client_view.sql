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
