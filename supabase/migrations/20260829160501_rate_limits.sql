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
