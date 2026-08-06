-- 1. Organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Korxona',
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Add org_id everywhere
ALTER TABLE public.user_roles   ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.categories   ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.products     ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.periods      ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.workers      ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.work_entries ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.app_settings ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

-- 3. Backfill existing data into one org
DO $$
DECLARE _org uuid; _owner uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.user_roles WHERE role = 'admin' ORDER BY id LIMIT 1;
  INSERT INTO public.organizations(name, owner_id) VALUES ('Asosiy korxona', _owner) RETURNING id INTO _org;
  UPDATE public.user_roles   SET org_id = _org WHERE org_id IS NULL;
  UPDATE public.categories   SET org_id = _org WHERE org_id IS NULL;
  UPDATE public.products     SET org_id = _org WHERE org_id IS NULL;
  UPDATE public.periods      SET org_id = _org WHERE org_id IS NULL;
  UPDATE public.workers      SET org_id = _org WHERE org_id IS NULL;
  UPDATE public.work_entries SET org_id = _org WHERE org_id IS NULL;
  UPDATE public.app_settings SET org_id = _org WHERE org_id IS NULL;
END $$;

ALTER TABLE public.user_roles   ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.categories   ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.products     ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.periods      ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.workers      ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.work_entries ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.app_settings ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE public.app_settings ADD PRIMARY KEY (org_id, key);

-- 4. Policies
CREATE POLICY "members read own org" ON public.organizations
  FOR SELECT TO authenticated USING (id = public.current_org_id());
CREATE POLICY "admins update own org" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = public.current_org_id() AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "anyone read categories" ON public.categories;
DROP POLICY IF EXISTS "admins manage categories" ON public.categories;
CREATE POLICY "admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "anyone read products" ON public.products;
DROP POLICY IF EXISTS "admins manage products" ON public.products;
CREATE POLICY "admins manage products" ON public.products FOR ALL TO authenticated
  USING (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "anyone read periods" ON public.periods;
DROP POLICY IF EXISTS "admins manage periods" ON public.periods;
CREATE POLICY "admins manage periods" ON public.periods FOR ALL TO authenticated
  USING (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins manage app_settings" ON public.app_settings;
CREATE POLICY "admins manage app_settings" ON public.app_settings FOR ALL TO authenticated
  USING (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins select workers safe cols" ON public.workers;
DROP POLICY IF EXISTS "admins insert workers" ON public.workers;
DROP POLICY IF EXISTS "admins update workers" ON public.workers;
DROP POLICY IF EXISTS "admins delete workers" ON public.workers;
CREATE POLICY "admins select workers" ON public.workers FOR SELECT TO authenticated
  USING (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins insert workers" ON public.workers FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update workers" ON public.workers FOR UPDATE TO authenticated
  USING (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete workers" ON public.workers FOR DELETE TO authenticated
  USING (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins read entries" ON public.work_entries;
DROP POLICY IF EXISTS "admins update entries" ON public.work_entries;
DROP POLICY IF EXISTS "admins delete entries" ON public.work_entries;
CREATE POLICY "admins read entries" ON public.work_entries FOR SELECT TO authenticated
  USING (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update entries" ON public.work_entries FOR UPDATE TO authenticated
  USING (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete entries" ON public.work_entries FOR DELETE TO authenticated
  USING (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));

-- 5. Functions
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _uid uuid := auth.uid(); _org uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT org_id INTO _org FROM public.user_roles WHERE user_id = _uid LIMIT 1;
  IF _org IS NOT NULL THEN RETURN; END IF;
  INSERT INTO public.organizations(name, owner_id) VALUES ('Korxona', _uid) RETURNING id INTO _org;
  INSERT INTO public.user_roles(user_id, role, org_id) VALUES (_uid, 'admin', _org);
  INSERT INTO public.app_settings(org_id, key, value) VALUES (_org, 'admin_pin_hash', crypt('0000', gen_salt('bf')));
  INSERT INTO public.periods(org_id, start_date, status) VALUES (_org, current_date, 'open');
END $$;

CREATE OR REPLACE FUNCTION public.worker_org_id(_wid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.workers WHERE id = _wid
$$;

CREATE OR REPLACE FUNCTION public.get_current_period()
RETURNS TABLE(id uuid, start_date date) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.start_date FROM public.periods p
  WHERE p.status='open' AND p.org_id = public.current_org_id()
  ORDER BY p.start_date DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_worker_period(_token uuid)
RETURNS TABLE(id uuid, name text, start_date date, end_date date) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid := public.worker_session_check(_token); _org uuid := public.worker_org_id(_wid);
BEGIN
  RETURN QUERY SELECT p.id, p.name, p.start_date, p.end_date FROM public.periods p
    WHERE p.status='open' AND p.org_id = _org ORDER BY p.start_date DESC LIMIT 1;
END $$;

CREATE OR REPLACE FUNCTION public.get_worker_products(_token uuid)
RETURNS TABLE(id uuid, name text, price numeric, category_id uuid, category_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid := public.worker_session_check(_token); _org uuid := public.worker_org_id(_wid);
BEGIN
  RETURN QUERY SELECT pr.id, pr.name, pr.price, pr.category_id, c.name
    FROM public.products pr LEFT JOIN public.categories c ON c.id = pr.category_id
    WHERE pr.org_id = _org AND pr.active = true ORDER BY pr.name;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_periods(_token uuid)
RETURNS TABLE(id uuid, name text, start_date date, end_date date, status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid := public.worker_session_check(_token); _org uuid := public.worker_org_id(_wid);
BEGIN
  RETURN QUERY SELECT p.id, p.name, p.start_date, p.end_date, p.status
    FROM public.periods p WHERE p.org_id = _org ORDER BY p.start_date DESC;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_entries(_token uuid, _period_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, work_date date, quantity numeric, unit_price numeric, total numeric, product_name text, category_name text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  _wid uuid := public.worker_session_check(_token);
  _org uuid := public.worker_org_id(_wid);
  _start date; _end date;
BEGIN
  IF _period_id IS NULL THEN
    SELECT p.start_date, COALESCE(p.end_date, current_date) INTO _start, _end
    FROM public.periods p WHERE p.status='open' AND p.org_id=_org ORDER BY p.start_date DESC LIMIT 1;
  ELSE
    SELECT p.start_date, COALESCE(p.end_date, current_date) INTO _start, _end
    FROM public.periods p WHERE p.id = _period_id AND p.org_id=_org;
  END IF;
  IF _start IS NULL THEN _start := '1900-01-01'::date; END IF;
  RETURN QUERY
    SELECT e.id, e.work_date, e.quantity, e.unit_price, e.total, pr.name, c.name, e.created_at
    FROM public.work_entries e
    JOIN public.products pr ON pr.id = e.product_id
    LEFT JOIN public.categories c ON c.id = pr.category_id
    WHERE e.worker_id = _wid AND e.work_date >= _start AND e.work_date <= _end
    ORDER BY e.work_date DESC, e.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.submit_work_entry(_token uuid, _product_id uuid, _quantity numeric, _work_date date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  _wid uuid := public.worker_session_check(_token);
  _org uuid := public.worker_org_id(_wid);
  _price numeric; _id uuid; _p_start date; _p_end date;
  _wd date := COALESCE(_work_date, current_date);
BEGIN
  SELECT price INTO _price FROM public.products WHERE id=_product_id AND active=true AND org_id=_org;
  IF _price IS NULL THEN RAISE EXCEPTION 'invalid_product'; END IF;
  SELECT start_date, COALESCE(end_date, current_date) INTO _p_start, _p_end
    FROM public.periods WHERE status='open' AND org_id=_org ORDER BY start_date DESC LIMIT 1;
  IF _p_start IS NULL THEN RAISE EXCEPTION 'no_open_period'; END IF;
  IF _wd > current_date THEN RAISE EXCEPTION 'date_in_future'; END IF;
  IF _wd < _p_start THEN RAISE EXCEPTION 'date_before_period_start'; END IF;
  IF _wd > _p_end THEN RAISE EXCEPTION 'date_after_period_end'; END IF;
  INSERT INTO public.work_entries(worker_id, product_id, quantity, unit_price, work_date, org_id)
    VALUES (_wid, _product_id, _quantity, _price, _wd, _org) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.update_my_entry(_token uuid, _entry_id uuid, _product_id uuid, _quantity numeric, _work_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  _wid uuid := public.worker_session_check(_token);
  _org uuid := public.worker_org_id(_wid);
  _price numeric; _p_start date; _p_end date;
  _wd date := COALESCE(_work_date, current_date);
  _entry_worker uuid; _entry_date date;
BEGIN
  SELECT worker_id, work_date INTO _entry_worker, _entry_date FROM public.work_entries WHERE id=_entry_id;
  IF _entry_worker IS NULL THEN RAISE EXCEPTION 'entry_not_found'; END IF;
  IF _entry_worker <> _wid THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT start_date, COALESCE(end_date, current_date) INTO _p_start, _p_end
    FROM public.periods WHERE status='open' AND org_id=_org ORDER BY start_date DESC LIMIT 1;
  IF _p_start IS NULL THEN RAISE EXCEPTION 'no_open_period'; END IF;
  IF _entry_date < _p_start OR _entry_date > _p_end THEN RAISE EXCEPTION 'entry_not_in_open_period'; END IF;
  SELECT price INTO _price FROM public.products WHERE id=_product_id AND active=true AND org_id=_org;
  IF _price IS NULL THEN RAISE EXCEPTION 'invalid_product'; END IF;
  IF _wd > current_date THEN RAISE EXCEPTION 'date_in_future'; END IF;
  IF _wd < _p_start THEN RAISE EXCEPTION 'date_before_period_start'; END IF;
  IF _wd > _p_end THEN RAISE EXCEPTION 'date_after_period_end'; END IF;
  IF _quantity IS NULL OR _quantity <= 0 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
  UPDATE public.work_entries SET product_id=_product_id, quantity=_quantity, unit_price=_price, work_date=_wd
    WHERE id=_entry_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_entry(_entry_id uuid, _product_id uuid, _quantity numeric, _work_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _price numeric; _org uuid := public.current_org_id();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.work_entries WHERE id=_entry_id AND org_id=_org) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT price INTO _price FROM public.products WHERE id=_product_id AND org_id=_org;
  IF _price IS NULL THEN RAISE EXCEPTION 'invalid_product'; END IF;
  UPDATE public.work_entries SET product_id=_product_id, quantity=_quantity, unit_price=_price,
    work_date=COALESCE(_work_date, work_date) WHERE id=_entry_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_worker(_id uuid, _code text, _name text, _pin text, _active boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _new_id uuid; _org uuid := public.current_org_id();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _org IS NULL THEN RAISE EXCEPTION 'no_org'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.workers(worker_code, name, pin_hash, active, org_id)
      VALUES (_code, _name, crypt(_pin, gen_salt('bf')), COALESCE(_active,true), _org)
      RETURNING id INTO _new_id;
    RETURN _new_id;
  ELSE
    UPDATE public.workers SET worker_code=_code, name=_name, active=COALESCE(_active, active),
      pin_hash = CASE WHEN _pin IS NOT NULL AND _pin <> '' THEN crypt(_pin, gen_salt('bf')) ELSE pin_hash END
      WHERE id=_id AND org_id=_org;
    RETURN _id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.close_current_period(_end_date date DEFAULT NULL, _next_start date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cur_id uuid; _cur_start date; _close_date date; _next date; _new_id uuid; _org uuid := public.current_org_id();
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT id, start_date INTO _cur_id, _cur_start FROM public.periods
    WHERE status='open' AND org_id=_org ORDER BY start_date DESC LIMIT 1;
  IF _cur_id IS NULL THEN RAISE EXCEPTION 'no_open_period'; END IF;
  _close_date := COALESCE(_end_date, current_date);
  IF _close_date < _cur_start THEN RAISE EXCEPTION 'end_date_before_start'; END IF;
  _next := COALESCE(_next_start, _close_date + INTERVAL '1 day');
  IF _next <= _close_date THEN RAISE EXCEPTION 'next_start_must_be_after_end'; END IF;
  UPDATE public.periods SET status='closed', end_date=_close_date, closed_at=now(),
    name = COALESCE(name, public.period_auto_name(start_date)) WHERE id=_cur_id;
  INSERT INTO public.periods(start_date, status, name, org_id)
    VALUES (_next, 'open', public.period_auto_name(_next), _org) RETURNING id INTO _new_id;
  RETURN _new_id;
END $$;

CREATE OR REPLACE FUNCTION public.set_admin_pin(_old_pin text, _new_pin text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _hash text; _org uuid := public.current_org_id();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _new_pin IS NULL OR length(_new_pin) < 4 THEN RAISE EXCEPTION 'pin_too_short'; END IF;
  SELECT value INTO _hash FROM public.app_settings WHERE key='admin_pin_hash' AND org_id=_org;
  IF _hash IS NOT NULL AND _hash <> crypt(_old_pin, _hash) THEN RAISE EXCEPTION 'invalid_old_pin'; END IF;
  INSERT INTO public.app_settings(org_id, key, value, updated_at)
    VALUES (_org, 'admin_pin_hash', crypt(_new_pin, gen_salt('bf')), now())
    ON CONFLICT (org_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.verify_admin_pin(_pin text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _hash text; _org uuid := public.current_org_id();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT value INTO _hash FROM public.app_settings WHERE key='admin_pin_hash' AND org_id=_org;
  IF _hash IS NULL THEN RETURN false; END IF;
  RETURN _hash = crypt(_pin, _hash);
END $$;

CREATE OR REPLACE FUNCTION public.products_propagate_price()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price THEN
    UPDATE public.work_entries SET unit_price = NEW.price WHERE product_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.orgs_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_orgs_updated_at BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.orgs_touch_updated_at();