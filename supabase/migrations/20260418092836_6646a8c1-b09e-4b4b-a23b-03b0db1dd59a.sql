CREATE OR REPLACE FUNCTION public.get_my_entries(_worker_id uuid, _pin text)
 RETURNS TABLE(id uuid, work_date date, quantity numeric, unit_price numeric, total numeric, product_name text, category_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare _ok boolean;
begin
  select true into _ok from public.workers w
    where w.id = _worker_id and w.active = true and w.pin_hash = crypt(_pin, w.pin_hash);
  if not _ok then raise exception 'invalid_pin'; end if;

  return query
    select e.id, e.work_date, e.quantity, e.unit_price, e.total,
           p.name as product_name, c.name as category_name, e.created_at
    from public.work_entries e
    join public.products p on p.id = e.product_id
    left join public.categories c on c.id = p.category_id
    where e.worker_id = _worker_id
    order by e.work_date desc, e.created_at desc;
end; $function$;