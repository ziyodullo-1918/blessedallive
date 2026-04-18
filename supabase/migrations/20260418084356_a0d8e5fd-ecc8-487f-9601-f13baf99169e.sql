create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "admins read roles" on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create extension if not exists pgcrypto;

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  worker_code text not null unique,
  name text not null,
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.workers enable row level security;

create policy "admins manage workers" on public.workers for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy "admins manage categories" on public.categories for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "anyone read categories" on public.categories for select using (true);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  price numeric(12,2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "admins manage products" on public.products for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "anyone read products" on public.products for select using (true);

create table public.work_entries (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(14,2) generated always as (quantity * unit_price) stored,
  work_date date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.work_entries enable row level security;
create index on public.work_entries(worker_id, work_date);
create index on public.work_entries(work_date);

create policy "admins read entries" on public.work_entries for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete entries" on public.work_entries for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.worker_login(_code text, _pin text)
returns table(id uuid, worker_code text, name text)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
    select w.id, w.worker_code, w.name
    from public.workers w
    where w.worker_code = _code
      and w.active = true
      and w.pin_hash = crypt(_pin, w.pin_hash);
end; $$;

create or replace function public.submit_work_entry(
  _worker_id uuid, _pin text, _product_id uuid, _quantity numeric, _work_date date
) returns uuid
language plpgsql security definer set search_path = public as $$
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
end; $$;

create or replace function public.get_my_entries(_worker_id uuid, _pin text)
returns table(
  id uuid, work_date date, quantity numeric, unit_price numeric, total numeric,
  product_name text, category_name text, created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
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
end; $$;

create or replace function public.delete_my_entry(_worker_id uuid, _pin text, _entry_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare _ok boolean;
begin
  select true into _ok from public.workers
    where id = _worker_id and active = true and pin_hash = crypt(_pin, pin_hash);
  if not _ok then raise exception 'invalid_pin'; end if;
  delete from public.work_entries where id = _entry_id and worker_id = _worker_id;
end; $$;

create or replace function public.admin_upsert_worker(
  _id uuid, _code text, _name text, _pin text, _active boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
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
end; $$;