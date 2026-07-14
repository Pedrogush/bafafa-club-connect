DROP POLICY IF EXISTS "Authenticated can insert their own audit rows" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM authenticated, anon;