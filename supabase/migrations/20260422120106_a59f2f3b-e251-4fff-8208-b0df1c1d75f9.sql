
-- Profiles: drop the broad policy and replace with two safer ones
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

-- A safe public-ish view that excludes email
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on)
AS
SELECT id, user_id, display_name, avatar_url, created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;

-- Only the owner can read the full profile row (including email)
CREATE POLICY "Users read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can read everything
CREATE POLICY "Admins read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- The view inherits RLS via security_invoker; we need a dedicated SELECT policy
-- for the columns the view needs. Allow authenticated to SELECT non-email columns
-- by giving them a parallel "viewable name fields" policy.
-- Simpler: enable a permissive SELECT but applications should use the view.
-- We'll keep strict RLS on the table and rely on the view for shared name lookups.
-- Grant the view direct access by creating a security definer function instead:

CREATE OR REPLACE FUNCTION public.list_profiles_public()
RETURNS TABLE (user_id UUID, display_name TEXT, avatar_url TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, display_name, avatar_url FROM public.profiles;
$$;

GRANT EXECUTE ON FUNCTION public.list_profiles_public() TO authenticated;

-- Roles: restrict broad SELECT
DROP POLICY IF EXISTS "Roles viewable by authenticated" ON public.user_roles;

CREATE POLICY "Users read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
