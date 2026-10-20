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
