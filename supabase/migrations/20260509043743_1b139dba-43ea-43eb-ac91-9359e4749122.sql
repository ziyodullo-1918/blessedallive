
CREATE OR REPLACE FUNCTION public.products_propagate_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price THEN
    UPDATE public.work_entries
       SET unit_price = NEW.price
     WHERE product_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_products_propagate_price ON public.products;
CREATE TRIGGER trg_products_propagate_price
AFTER UPDATE OF price ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_propagate_price();

-- Backfill mismatched existing entries
UPDATE public.work_entries we
   SET unit_price = p.price
  FROM public.products p
 WHERE we.product_id = p.id
   AND we.unit_price <> p.price;
