CREATE OR REPLACE FUNCTION public.update_my_entry(
  _token uuid,
  _entry_id uuid,
  _product_id uuid,
  _quantity numeric,
  _work_date date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _wid uuid := public.worker_session_check(_token);
  _price numeric;
  _p_start date; _p_end date;
  _wd date := COALESCE(_work_date, current_date);
  _entry_worker uuid;
  _entry_date date;
BEGIN
  SELECT worker_id, work_date INTO _entry_worker, _entry_date
    FROM public.work_entries WHERE id = _entry_id;
  IF _entry_worker IS NULL THEN RAISE EXCEPTION 'entry_not_found'; END IF;
  IF _entry_worker <> _wid THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT start_date, COALESCE(end_date, current_date)
    INTO _p_start, _p_end
    FROM public.periods WHERE status='open' ORDER BY start_date DESC LIMIT 1;
  IF _p_start IS NULL THEN RAISE EXCEPTION 'no_open_period'; END IF;

  IF _entry_date < _p_start OR _entry_date > _p_end THEN
    RAISE EXCEPTION 'entry_not_in_open_period';
  END IF;

  SELECT price INTO _price FROM public.products WHERE id = _product_id AND active = true;
  IF _price IS NULL THEN RAISE EXCEPTION 'invalid_product'; END IF;

  IF _wd > current_date THEN RAISE EXCEPTION 'date_in_future'; END IF;
  IF _wd < _p_start THEN RAISE EXCEPTION 'date_before_period_start'; END IF;
  IF _wd > _p_end THEN RAISE EXCEPTION 'date_after_period_end'; END IF;
  IF _quantity IS NULL OR _quantity <= 0 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;

  UPDATE public.work_entries
    SET product_id = _product_id,
        quantity = _quantity,
        unit_price = _price,
        work_date = _wd
    WHERE id = _entry_id;
END; $$;