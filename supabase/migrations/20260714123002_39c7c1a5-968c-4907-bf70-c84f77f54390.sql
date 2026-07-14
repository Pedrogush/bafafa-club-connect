
REVOKE ALL ON FUNCTION public.grant_badge_by_slug(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_checkin_after_insert() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_badge_by_slug(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.tg_checkin_after_insert() TO service_role;

-- Also lock down the tg_set_updated_at helper if it was granted broadly
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_set_updated_at() TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE ALL ON FUNCTION public.tg_block_self_privileged_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_block_self_privileged_role() TO service_role;

-- Explicit deny-all policy on otp_attempts (still service_role bypass RLS)
CREATE POLICY "Deny all api access" ON public.otp_attempts FOR SELECT USING (false);
