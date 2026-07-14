
-- 1) profiles: restrict SELECT to owner only; expose safe public view respecting toggles
DROP POLICY IF EXISTS "Public profiles are viewable by any authenticated user" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Owners can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id AND deleted_at IS NULL);

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT
  id,
  display_name,
  username,
  avatar_url,
  bio,
  member_since,
  is_public,
  CASE WHEN show_city THEN city ELSE NULL END AS city,
  CASE WHEN show_birth_month AND birth_date IS NOT NULL
       THEN EXTRACT(MONTH FROM birth_date)::int ELSE NULL END AS birth_month
FROM public.profiles
WHERE deleted_at IS NULL AND is_public = true;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- 2) app_settings: restrict reads to admins only
DROP POLICY IF EXISTS "Authenticated can read app settings" ON public.app_settings;
-- Admins manage app settings (ALL) already covers admin reads.

-- 3) SECURITY DEFINER functions: revoke execute from authenticated/anon/public.
-- has_role is used inside RLS policies (runs as table owner), so revoking
-- direct EXECUTE from clients does not break policies.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_user_roles() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.current_user_roles() TO service_role;
