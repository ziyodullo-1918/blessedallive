
CREATE OR REPLACE FUNCTION public.products_propagate_price()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
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
