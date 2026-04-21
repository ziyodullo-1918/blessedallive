CREATE OR REPLACE FUNCTION public.worker_login(_code text, _pin text)
 RETURNS TABLE(id uuid, worker_code text, name text, session_token uuid, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _w_id uuid; _w_code text; _w_name text; _tok uuid; _exp timestamptz;
BEGIN
  SELECT w.id, w.worker_code, w.name INTO _w_id, _w_code, _w_name
  FROM public.workers w
  WHERE w.worker_code = _code AND w.active = true
    AND w.pin_hash = crypt(_pin, w.pin_hash);
  IF _w_id IS NULL THEN RETURN; END IF;

  DELETE FROM public.worker_sessions ws WHERE ws.expires_at < now();

  INSERT INTO public.worker_sessions(worker_id) VALUES (_w_id)
  RETURNING worker_sessions.token, worker_sessions.expires_at INTO _tok, _exp;

  RETURN QUERY SELECT _w_id, _w_code, _w_name, _tok, _exp;
END;
$function$;