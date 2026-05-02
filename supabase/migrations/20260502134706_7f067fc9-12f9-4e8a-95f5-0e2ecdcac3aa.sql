-- 1) close_current_period: do not silently override admin's chosen end date
CREATE OR REPLACE FUNCTION public.close_current_period(_end_date date DEFAULT NULL::date, _next_start date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _cur_id uuid; _cur_start date; _close_date date; _next date; _new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT id, start_date INTO _cur_id, _cur_start
    FROM public.periods WHERE status='open' ORDER BY start_date DESC LIMIT 1;
  IF _cur_id IS NULL THEN RAISE EXCEPTION 'no_open_period'; END IF;

  _close_date := COALESCE(_end_date, current_date);
  IF _close_date < _cur_start THEN
    RAISE EXCEPTION 'end_date_before_start';
  END IF;
  _next := COALESCE(_next_start, _close_date + INTERVAL '1 day');
  IF _next <= _close_date THEN
    RAISE EXCEPTION 'next_start_must_be_after_end';
  END IF;

  UPDATE public.periods
    SET status='closed', end_date=_close_date, closed_at=now(),
        name = COALESCE(name, public.period_auto_name(start_date))
    WHERE id=_cur_id;

  INSERT INTO public.periods(start_date, status, name)
    VALUES (_next, 'open', public.period_auto_name(_next))
    RETURNING id INTO _new_id;
  RETURN _new_id;
END; $function$;

-- 2) submit_work_entry: enforce date within current open period and not in the future
CREATE OR REPLACE FUNCTION public.submit_work_entry(_token uuid, _product_id uuid, _quantity numeric, _work_date date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _wid uuid := public.worker_session_check(_token);
  _price numeric; _id uuid;
  _p_start date; _p_end date;
  _wd date := COALESCE(_work_date, current_date);
BEGIN
  SELECT price INTO _price FROM public.products WHERE id = _product_id AND active = true;
  IF _price IS NULL THEN RAISE EXCEPTION 'invalid_product'; END IF;

  SELECT start_date, COALESCE(end_date, current_date)
    INTO _p_start, _p_end
    FROM public.periods WHERE status='open' ORDER BY start_date DESC LIMIT 1;
  IF _p_start IS NULL THEN RAISE EXCEPTION 'no_open_period'; END IF;

  IF _wd > current_date THEN RAISE EXCEPTION 'date_in_future'; END IF;
  IF _wd < _p_start THEN RAISE EXCEPTION 'date_before_period_start'; END IF;
  IF _wd > _p_end THEN RAISE EXCEPTION 'date_after_period_end'; END IF;

  INSERT INTO public.work_entries(worker_id, product_id, quantity, unit_price, work_date)
    VALUES (_wid, _product_id, _quantity, _price, _wd)
    RETURNING id INTO _id;
  RETURN _id;
END; $function$;