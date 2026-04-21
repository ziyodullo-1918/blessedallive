-- 1. Remove work_entries from realtime publication (blocks broadcast leak)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'work_entries'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.work_entries';
  END IF;
END $$;

-- 2. Drop the broad admins-select-workers policy that exposed pin_hash
DROP POLICY IF EXISTS "admins select workers" ON public.workers;

-- 3. Revoke direct column-level access to pin_hash from authenticated role
REVOKE SELECT (pin_hash) ON public.workers FROM authenticated;
REVOKE SELECT (pin_hash) ON public.workers FROM anon;

-- 4. Re-add admin SELECT but only for non-sensitive columns
GRANT SELECT (id, worker_code, name, active, created_at) ON public.workers TO authenticated;

CREATE POLICY "admins select workers safe cols"
ON public.workers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Ensure workers_safe view is the canonical read path for admins
GRANT SELECT ON public.workers_safe TO authenticated;