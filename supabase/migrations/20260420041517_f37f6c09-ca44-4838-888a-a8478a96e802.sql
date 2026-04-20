
-- 1) PERIODS: name + auto-naming
ALTER TABLE public.periods ADD COLUMN IF NOT EXISTS name text;

CREATE OR REPLACE FUNCTION public.period_auto_name(_d date)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  _months text[] := ARRAY['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];
  _m int := EXTRACT(MONTH FROM _d)::int;
  _day int := EXTRACT(DAY FROM _d)::int;
  _part text;
BEGIN
  IF _day <= 10 THEN _part := 'boshi';
  ELSIF _day <= 20 THEN _part := 'o''rtasi';
  ELSE _part := 'oxiri';
  END IF;
  RETURN _months[_m] || ' ' || _part;
END; $$;

UPDATE public.periods SET name = public.period_auto_name(start_date) WHERE name IS NULL;

CREATE OR REPLACE FUNCTION public.periods_set_name()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.name IS NULL OR NEW.name = '' THEN
    NEW.name := public.period_auto_name(NEW.start_date);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_periods_set_name ON public.periods;
CREATE TRIGGER trg_periods_set_name
  BEFORE INSERT ON public.periods
  FOR EACH ROW EXECUTE FUNCTION public.periods_set_name();

-- 2) WORKER SESSIONS
CREATE TABLE IF NOT EXISTS public.worker_sessions (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours')
);
ALTER TABLE public.worker_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct access worker_sessions" ON public.worker_sessions;
CREATE POLICY "no direct access worker_sessions"
  ON public.worker_sessions FOR SELECT TO authenticated, anon USING (false);
CREATE INDEX IF NOT EXISTS idx_worker_sessions_worker ON public.worker_sessions(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_sessions_exp ON public.worker_sessions(expires_at);

-- 3) Drop old function signatures first
DROP FUNCTION IF EXISTS public.worker_login(text, text);
DROP FUNCTION IF EXISTS public.submit_work_entry(uuid, text, uuid, numeric, date);
DROP FUNCTION IF EXISTS public.delete_my_entry(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.get_my_entries(uuid, text);
DROP FUNCTION IF EXISTS public.close_current_period(date);

-- 4) Recreate with token-based auth
CREATE FUNCTION public.worker_login(_code text, _pin text)
RETURNS TABLE(id uuid, worker_code text, name text, session_token uuid, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  _w_id uuid; _w_code text; _w_name text; _tok uuid; _exp timestamptz;
BEGIN
  SELECT w.id, w.worker_code, w.name INTO _w_id, _w_code, _w_name
  FROM public.workers w
  WHERE w.worker_code = _code AND w.active = true
    AND w.pin_hash = crypt(_pin, w.pin_hash);
  IF _w_id IS NULL THEN RETURN; END IF;

  DELETE FROM public.worker_sessions WHERE expires_at < now();
  INSERT INTO public.worker_sessions(worker_id) VALUES (_w_id)
  RETURNING token, worker_sessions.expires_at INTO _tok, _exp;
  RETURN QUERY SELECT _w_id, _w_code, _w_name, _tok, _exp;
END; $$;

CREATE OR REPLACE FUNCTION public.worker_session_check(_token uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid;
BEGIN
  SELECT worker_id INTO _wid FROM public.worker_sessions
    WHERE token = _token AND expires_at > now();
  IF _wid IS NULL THEN RAISE EXCEPTION 'invalid_session'; END IF;
  RETURN _wid;
END; $$;

CREATE OR REPLACE FUNCTION public.worker_logout(_token uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.worker_sessions WHERE token = _token;
$$;

CREATE FUNCTION public.submit_work_entry(_token uuid, _product_id uuid, _quantity numeric, _work_date date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  _wid uuid := public.worker_session_check(_token);
  _price numeric; _id uuid;
BEGIN
  SELECT price INTO _price FROM public.products WHERE id = _product_id AND active = true;
  IF _price IS NULL THEN RAISE EXCEPTION 'invalid_product'; END IF;
  INSERT INTO public.work_entries(worker_id, product_id, quantity, unit_price, work_date)
    VALUES (_wid, _product_id, _quantity, _price, COALESCE(_work_date, current_date))
    RETURNING id INTO _id;
  RETURN _id;
END; $$;

CREATE FUNCTION public.delete_my_entry(_token uuid, _entry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _wid uuid := public.worker_session_check(_token);
BEGIN
  DELETE FROM public.work_entries WHERE id = _entry_id AND worker_id = _wid;
END; $$;

CREATE FUNCTION public.get_my_entries(_token uuid, _period_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, work_date date, quantity numeric, unit_price numeric, total numeric, product_name text, category_name text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  _wid uuid := public.worker_session_check(_token);
  _start date; _end date;
BEGIN
  IF _period_id IS NULL THEN
    SELECT p.start_date, COALESCE(p.end_date, current_date) INTO _start, _end
    FROM public.periods p WHERE p.status='open' ORDER BY p.start_date DESC LIMIT 1;
  ELSE
    SELECT p.start_date, COALESCE(p.end_date, current_date) INTO _start, _end
    FROM public.periods p WHERE p.id = _period_id;
  END IF;
  IF _start IS NULL THEN _start := '1900-01-01'::date; END IF;
  RETURN QUERY
    SELECT e.id, e.work_date, e.quantity, e.unit_price, e.total,
           pr.name, c.name, e.created_at
    FROM public.work_entries e
    JOIN public.products pr ON pr.id = e.product_id
    LEFT JOIN public.categories c ON c.id = pr.category_id
    WHERE e.worker_id = _wid AND e.work_date >= _start AND e.work_date <= _end
    ORDER BY e.work_date DESC, e.created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.get_my_periods(_token uuid)
RETURNS TABLE(id uuid, name text, start_date date, end_date date, status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid := public.worker_session_check(_token);
BEGIN
  RETURN QUERY
    SELECT p.id, p.name, p.start_date, p.end_date, p.status
    FROM public.periods p ORDER BY p.start_date DESC;
END; $$;

-- 5) close_current_period with custom dates
CREATE FUNCTION public.close_current_period(_end_date date DEFAULT NULL, _next_start date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cur_id uuid; _cur_start date; _close_date date; _next date; _new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT id, start_date INTO _cur_id, _cur_start
    FROM public.periods WHERE status='open' ORDER BY start_date DESC LIMIT 1;
  IF _cur_id IS NULL THEN RAISE EXCEPTION 'no_open_period'; END IF;

  _close_date := COALESCE(_end_date, current_date);
  IF _close_date < _cur_start THEN _close_date := _cur_start; END IF;
  _next := COALESCE(_next_start, _close_date + INTERVAL '1 day');
  IF _next <= _close_date THEN _next := _close_date + INTERVAL '1 day'; END IF;

  UPDATE public.periods
    SET status='closed', end_date=_close_date, closed_at=now(),
        name = COALESCE(name, public.period_auto_name(start_date))
    WHERE id=_cur_id;

  INSERT INTO public.periods(start_date, status, name)
    VALUES (_next, 'open', public.period_auto_name(_next))
    RETURNING id INTO _new_id;
  RETURN _new_id;
END; $$;

-- 6) Workers RLS split
DROP POLICY IF EXISTS "admins manage workers" ON public.workers;
CREATE POLICY "admins select workers" ON public.workers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert workers" ON public.workers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update workers" ON public.workers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete workers" ON public.workers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- workers_safe view excludes pin_hash
DROP VIEW IF EXISTS public.workers_safe;
CREATE VIEW public.workers_safe WITH (security_invoker=on) AS
  SELECT id, worker_code, name, active, created_at FROM public.workers;
GRANT SELECT ON public.workers_safe TO authenticated;

-- 7) Grants
GRANT EXECUTE ON FUNCTION public.worker_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.worker_logout(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_work_entry(uuid, uuid, numeric, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_entry(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_entries(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_periods(uuid) TO anon, authenticated;
