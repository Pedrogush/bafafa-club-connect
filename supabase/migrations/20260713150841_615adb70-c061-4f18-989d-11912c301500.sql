
-- Trigger functions: never called from API
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.tg_block_self_privileged_role() from public, anon, authenticated;
revoke all on function public.tg_set_updated_at() from public, anon, authenticated;

-- Callable from RLS policies (any role) — restrict to signed-in and service
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

revoke all on function public.current_user_roles() from public, anon;
grant execute on function public.current_user_roles() to authenticated, service_role;
