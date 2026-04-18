-- Allow admins to UPDATE work_entries via RLS (for direct updates)
CREATE POLICY "admins update entries"
ON public.work_entries
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RPC: admin updates a work entry (product, quantity, date). Unit price re-fetched from product.
CREATE OR REPLACE FUNCTION public.admin_update_entry(
  _entry_id uuid,
  _product_id uuid,
  _quantity numeric,
  _work_date date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _price numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT price INTO _price FROM public.products WHERE id = _product_id;
  IF _price IS NULL THEN
    RAISE EXCEPTION 'invalid_product';
  END IF;

  UPDATE public.work_entries
    SET product_id = _product_id,
        quantity = _quantity,
        unit_price = _price,
        work_date = COALESCE(_work_date, work_date)
  WHERE id = _entry_id;
END;
$$;