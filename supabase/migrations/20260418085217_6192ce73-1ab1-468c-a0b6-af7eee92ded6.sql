CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _count int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT count(*) INTO _count FROM public.user_roles WHERE role = 'admin';

  IF _count = 0 THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    IF NOT public.has_role(_uid, 'admin') THEN
      RAISE EXCEPTION 'admin_already_exists';
    END IF;
  END IF;
END;
$$;