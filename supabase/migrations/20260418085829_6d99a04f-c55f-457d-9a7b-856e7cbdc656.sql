CREATE OR REPLACE FUNCTION public.admin_upsert_worker(_id uuid, _code text, _name text, _pin text, _active boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare _new_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  if _id is null then
    insert into public.workers(worker_code, name, pin_hash, active)
      values (_code, _name, crypt(_pin, gen_salt('bf')), coalesce(_active, true))
      returning id into _new_id;
    return _new_id;
  else
    update public.workers set
      worker_code = _code,
      name = _name,
      active = coalesce(_active, active),
      pin_hash = case when _pin is not null and _pin <> '' then crypt(_pin, gen_salt('bf')) else pin_hash end
    where id = _id;
    return _id;
  end if;
end; $function$;

CREATE OR REPLACE FUNCTION public.worker_login(_code text, _pin text)
 RETURNS TABLE(id uuid, worker_code text, name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  return query
    select w.id, w.worker_code, w.name
    from public.workers w
    where w.worker_code = _code
      and w.active = true
      and w.pin_hash = crypt(_pin, w.pin_hash);
end; $function$;

CREATE OR REPLACE FUNCTION public.submit_work_entry(_worker_id uuid, _pin text, _product_id uuid, _quantity numeric, _work_date date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  _ok boolean;
  _price numeric;
  _id uuid;
begin
  select true into _ok from public.workers
    where id = _worker_id and active = true and pin_hash = crypt(_pin, pin_hash);
  if not _ok then raise exception 'invalid_pin'; end if;

  select price into _price from public.products where id = _product_id and active = true;
  if _price is null then raise exception 'invalid_product'; end if;

  insert into public.work_entries(worker_id, product_id, quantity, unit_price, work_date)
    values (_worker_id, _product_id, _quantity, _price, coalesce(_work_date, current_date))
    returning id into _id;
  return _id;
end; $function$;

CREATE OR REPLACE FUNCTION public.get_my_entries(_worker_id uuid, _pin text)
 RETURNS TABLE(id uuid, work_date date, quantity numeric, unit_price numeric, total numeric, product_name text, category_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare _ok boolean;
begin
  select true into _ok from public.workers
    where id = _worker_id and active = true and pin_hash = crypt(_pin, pin_hash);
  if not _ok then raise exception 'invalid_pin'; end if;

  return query
    select e.id, e.work_date, e.quantity, e.unit_price, e.total,
           p.name, c.name, e.created_at
    from public.work_entries e
    join public.products p on p.id = e.product_id
    left join public.categories c on c.id = p.category_id
    where e.worker_id = _worker_id
    order by e.work_date desc, e.created_at desc;
end; $function$;

CREATE OR REPLACE FUNCTION public.delete_my_entry(_worker_id uuid, _pin text, _entry_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare _ok boolean;
begin
  select true into _ok from public.workers
    where id = _worker_id and active = true and pin_hash = crypt(_pin, pin_hash);
  if not _ok then raise exception 'invalid_pin'; end if;
  delete from public.work_entries where id = _entry_id and worker_id = _worker_id;
end; $function$;