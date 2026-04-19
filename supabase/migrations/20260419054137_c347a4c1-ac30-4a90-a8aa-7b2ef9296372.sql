-- Davrlar (periods) jadvali
CREATE TABLE IF NOT EXISTS public.periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'open',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone,
  CONSTRAINT periods_status_chk CHECK (status IN ('open','closed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS periods_one_open_idx
  ON public.periods (status) WHERE status = 'open';

ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone read periods" ON public.periods
  FOR SELECT USING (true);

CREATE POLICY "admins manage periods" ON public.periods
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Boshlang'ich joriy davr (agar mavjud bo'lmasa)
INSERT INTO public.periods (start_date, status)
SELECT CURRENT_DATE, 'open'
WHERE NOT EXISTS (SELECT 1 FROM public.periods WHERE status='open');

-- Joriy davrni olish
CREATE OR REPLACE FUNCTION public.get_current_period()
RETURNS TABLE(id uuid, start_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, start_date FROM public.periods WHERE status='open' ORDER BY start_date DESC LIMIT 1;
$$;

-- Davrni yopish va yangi davr boshlash (admin)
CREATE OR REPLACE FUNCTION public.close_current_period(_end_date date DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _cur_id uuid;
  _cur_start date;
  _close_date date;
  _new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT id, start_date INTO _cur_id, _cur_start
    FROM public.periods WHERE status='open' ORDER BY start_date DESC LIMIT 1;
  IF _cur_id IS NULL THEN RAISE EXCEPTION 'no_open_period'; END IF;

  _close_date := COALESCE(_end_date, CURRENT_DATE);
  IF _close_date < _cur_start THEN _close_date := _cur_start; END IF;

  UPDATE public.periods
    SET status='closed', end_date=_close_date, closed_at=now()
    WHERE id=_cur_id;

  INSERT INTO public.periods(start_date, status)
    VALUES (_close_date + INTERVAL '1 day', 'open')
    RETURNING id INTO _new_id;

  RETURN _new_id;
END; $$;

-- Ishchi faqat joriy davrdagi yozuvlarini ko'radi
CREATE OR REPLACE FUNCTION public.get_my_entries(_worker_id uuid, _pin text)
RETURNS TABLE(id uuid, work_date date, quantity numeric, unit_price numeric, total numeric, product_name text, category_name text, created_at timestamp with time zone)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public','extensions'
AS $$
DECLARE _ok boolean; _cur_start date;
BEGIN
  SELECT true INTO _ok FROM public.workers w
    WHERE w.id=_worker_id AND w.active=true AND w.pin_hash=crypt(_pin,w.pin_hash);
  IF NOT _ok THEN RAISE EXCEPTION 'invalid_pin'; END IF;

  SELECT start_date INTO _cur_start FROM public.periods WHERE status='open' ORDER BY start_date DESC LIMIT 1;
  IF _cur_start IS NULL THEN _cur_start := '1900-01-01'::date; END IF;

  RETURN QUERY
    SELECT e.id, e.work_date, e.quantity, e.unit_price, e.total,
           p.name AS product_name, c.name AS category_name, e.created_at
    FROM public.work_entries e
    JOIN public.products p ON p.id=e.product_id
    LEFT JOIN public.categories c ON c.id=p.category_id
    WHERE e.worker_id=_worker_id AND e.work_date >= _cur_start
    ORDER BY e.work_date DESC, e.created_at DESC;
END; $$;