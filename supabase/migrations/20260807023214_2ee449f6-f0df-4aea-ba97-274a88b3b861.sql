ALTER TABLE public.categories ALTER COLUMN org_id SET DEFAULT public.current_org_id();
ALTER TABLE public.products ALTER COLUMN org_id SET DEFAULT public.current_org_id();
ALTER TABLE public.workers ALTER COLUMN org_id SET DEFAULT public.current_org_id();
ALTER TABLE public.periods ALTER COLUMN org_id SET DEFAULT public.current_org_id();
ALTER TABLE public.app_settings ALTER COLUMN org_id SET DEFAULT public.current_org_id();
ALTER TABLE public.work_entries ALTER COLUMN org_id SET DEFAULT public.current_org_id();