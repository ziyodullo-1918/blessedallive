
-- 1) Remove work_entries from realtime publication (fixes critical leak)
ALTER PUBLICATION supabase_realtime DROP TABLE public.work_entries;

-- 2) Revoke pin_hash column SELECT from all roles
REVOKE SELECT (pin_hash) ON public.workers FROM anon, authenticated, public;

-- 3) Explicit deny INSERT policy on work_entries (writes go through SECURITY DEFINER)
DROP POLICY IF EXISTS "no direct insert work_entries" ON public.work_entries;
CREATE POLICY "no direct insert work_entries"
  ON public.work_entries FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

-- 4) Same for worker_sessions (just to silence missing-policy warnings; SECURITY DEFINER handles writes)
DROP POLICY IF EXISTS "no direct insert worker_sessions" ON public.worker_sessions;
CREATE POLICY "no direct insert worker_sessions"
  ON public.worker_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "no direct update worker_sessions" ON public.worker_sessions;
CREATE POLICY "no direct update worker_sessions"
  ON public.worker_sessions FOR UPDATE
  TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no direct delete worker_sessions" ON public.worker_sessions;
CREATE POLICY "no direct delete worker_sessions"
  ON public.worker_sessions FOR DELETE
  TO anon, authenticated
  USING (false);
