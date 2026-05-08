
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage app_settings" ON public.app_settings;
CREATE POLICY "admins manage app_settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed default admin PIN = 0000 (only if not already set)
INSERT INTO public.app_settings(key, value)
  VALUES ('admin_pin_hash', extensions.crypt('0000', extensions.gen_salt('bf')))
  ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.verify_admin_pin(_pin text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE _hash text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT value INTO _hash FROM public.app_settings WHERE key = 'admin_pin_hash';
  IF _hash IS NULL THEN RETURN false; END IF;
  RETURN _hash = crypt(_pin, _hash);
END; $$;

CREATE OR REPLACE FUNCTION public.set_admin_pin(_old_pin text, _new_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE _hash text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _new_pin IS NULL OR length(_new_pin) < 4 THEN
    RAISE EXCEPTION 'pin_too_short';
  END IF;
  SELECT value INTO _hash FROM public.app_settings WHERE key = 'admin_pin_hash';
  IF _hash IS NOT NULL AND _hash <> crypt(_old_pin, _hash) THEN
    RAISE EXCEPTION 'invalid_old_pin';
  END IF;
  INSERT INTO public.app_settings(key, value, updated_at)
    VALUES ('admin_pin_hash', crypt(_new_pin, gen_salt('bf')), now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END; $$;
