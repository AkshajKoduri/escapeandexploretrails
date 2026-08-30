CREATE TABLE public.rate_limit_hits (
  id bigserial PRIMARY KEY,
  key text NOT NULL,
  hit_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rate_limit_hits_key_time_idx ON public.rate_limit_hits (key, hit_at DESC);

GRANT ALL ON public.rate_limit_hits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rate_limit_hits_id_seq TO service_role;

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
-- No policies: intentionally deny-all. Only the service role (edge functions) touches this table.

CREATE OR REPLACE FUNCTION public.check_rate_limit(_key text, _limit integer, _window_seconds integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cutoff timestamptz := now() - make_interval(secs => _window_seconds);
  _count integer;
  _oldest timestamptz;
BEGIN
  DELETE FROM public.rate_limit_hits
   WHERE hit_at < now() - make_interval(secs => GREATEST(_window_seconds, 3600));

  SELECT count(*), min(hit_at) INTO _count, _oldest
    FROM public.rate_limit_hits
   WHERE key = _key AND hit_at >= _cutoff;

  IF _count >= _limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after', GREATEST(CEIL(EXTRACT(EPOCH FROM (_oldest + make_interval(secs => _window_seconds)) - now()))::int, 1)
    );
  END IF;

  INSERT INTO public.rate_limit_hits (key) VALUES (_key);

  RETURN jsonb_build_object('allowed', true, 'remaining', _limit - _count - 1, 'retry_after', 0);
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.reset_rate_limit(_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_hits WHERE key = _key;
$$;

REVOKE ALL ON FUNCTION public.reset_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_rate_limit(text) TO service_role;