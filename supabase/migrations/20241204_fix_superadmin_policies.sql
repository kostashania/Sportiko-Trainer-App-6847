-- Fix superadmin policies and functions for proper RLS handling

-- First, let's create a more robust is_superadmin function that handles multiple scenarios
CREATE OR REPLACE FUNCTION public.is_superadmin(user_id UUID DEFAULT auth.uid()) 
RETURNS BOOLEAN AS $$ 
DECLARE
  result BOOLEAN := false;
BEGIN
  -- Handle null user_id
  IF user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check multiple ways to identify superadmin
  -- 1. Check superadmins table
  SELECT EXISTS (
    SELECT 1 FROM public.superadmins 
    WHERE id = user_id
  ) INTO result;
  
  IF result THEN
    RETURN true;
  END IF;
  
  -- 2. Check by known superadmin email from auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND email = 'superadmin_pt@sportiko.eu'
  ) INTO result;
  
  IF result THEN
    RETURN true;
  END IF;
  
  -- 3. Check by known superadmin ID
  IF user_id = 'be9c6165-808a-4335-b90e-22f6d20328bf' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a special policy that allows superadmin access even if they're not in the superadmins table yet
CREATE OR REPLACE FUNCTION public.superadmin_safe_access()
RETURNS BOOLEAN AS $$
BEGIN
  -- Allow access if user is known superadmin by email or ID
  RETURN (
    auth.uid() = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'superadmin_pt@sportiko.eu'
    ) OR
    EXISTS (
      SELECT 1 FROM public.superadmins 
      WHERE id = auth.uid()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now let's recreate the policies with better logic
-- First, drop existing policies
DROP POLICY IF EXISTS "Superadmins can do everything with trainers" ON public.trainers;
DROP POLICY IF EXISTS "superadmin_full_access_trainers" ON public.trainers;
DROP POLICY IF EXISTS "Trainers can view and update their own profile" ON public.trainers;
DROP POLICY IF EXISTS "trainer_view_own_profile" ON public.trainers;
DROP POLICY IF EXISTS "trainer_update_own_profile" ON public.trainers;
DROP POLICY IF EXISTS "allow_trainer_registration" ON public.trainers;

-- Create new comprehensive policies for trainers table
CREATE POLICY "superadmin_all_access_trainers" ON public.trainers
FOR ALL TO authenticated
USING (public.superadmin_safe_access())
WITH CHECK (public.superadmin_safe_access());

CREATE POLICY "trainer_own_profile_select" ON public.trainers
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.superadmin_safe_access());

CREATE POLICY "trainer_own_profile_update" ON public.trainers
FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.superadmin_safe_access())
WITH CHECK (id = auth.uid() OR public.superadmin_safe_access());

CREATE POLICY "trainer_registration_insert" ON public.trainers
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid() OR public.superadmin_safe_access());

-- Fix superadmins table policies
DROP POLICY IF EXISTS "Only superadmins can access superadmins table" ON public.superadmins;
DROP POLICY IF EXISTS "superadmin_only_access" ON public.superadmins;

CREATE POLICY "superadmin_safe_access_policy" ON public.superadmins
FOR ALL TO authenticated
USING (public.superadmin_safe_access())
WITH CHECK (public.superadmin_safe_access());

-- Ensure the known superadmin record exists
INSERT INTO public.superadmins (id, email, full_name, created_at)
VALUES (
  'be9c6165-808a-4335-b90e-22f6d20328bf',
  'superadmin_pt@sportiko.eu',
  'Super Admin',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION public.is_superadmin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.superadmin_safe_access() TO authenticated;

-- Test the functions
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  -- Test with known superadmin ID
  SELECT public.is_superadmin('be9c6165-808a-4335-b90e-22f6d20328bf') INTO test_result;
  RAISE NOTICE 'Superadmin ID test: %', test_result;
  
  -- Test safe access function
  -- Note: This won't work in migration context as auth.uid() is null
  RAISE NOTICE 'Superadmin policies updated successfully';
END $$;