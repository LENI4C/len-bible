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
