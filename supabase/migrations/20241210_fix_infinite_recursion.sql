-- Fix infinite recursion in superadmin policies
-- The issue is that the is_superadmin function checks the superadmins table,
-- but the superadmins table policy also calls is_superadmin, creating infinite recursion

-- First, let's create a safe superadmin check function that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.is_superadmin_safe(user_id UUID DEFAULT auth.uid()) 
RETURNS BOOLEAN AS $$
BEGIN
  -- If no user_id provided, return false
  IF user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check by known superadmin ID first (no table lookup)
  IF user_id = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid THEN
    RETURN true;
  END IF;

  -- Check by known superadmin email (no recursion since we're not checking superadmins table)
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND email = 'superadmin_pt@sportiko.eu'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function that can safely check the superadmins table without recursion
CREATE OR REPLACE FUNCTION public.check_superadmins_table(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- This function bypasses RLS to check the superadmins table
  -- It should only be used internally by other functions
  RETURN EXISTS (
    SELECT 1 FROM public.superadmins 
    WHERE id = COALESCE(user_id, auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now create the main is_superadmin function that combines both checks
CREATE OR REPLACE FUNCTION public.is_superadmin(user_id UUID DEFAULT auth.uid()) 
RETURNS BOOLEAN AS $$
BEGIN
  -- First check if user is superadmin by ID or email (no table lookup)
  IF public.is_superadmin_safe(user_id) THEN
    RETURN true;
  END IF;

  -- Then check the superadmins table (this won't cause recursion because
  -- check_superadmins_table bypasses RLS)
  RETURN public.check_superadmins_table(user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop all existing policies on superadmins table to recreate them
DROP POLICY IF EXISTS "Only superadmins can access superadmins table" ON public.superadmins;
DROP POLICY IF EXISTS "superadmin_only_access" ON public.superadmins;
DROP POLICY IF EXISTS "superadmin_safe_access_policy" ON public.superadmins;

-- Create a simple policy for superadmins table that doesn't cause recursion
CREATE POLICY "superadmin_access_by_id_or_email" 
ON public.superadmins 
FOR ALL 
TO authenticated 
USING (
  -- Allow access if user is the known superadmin ID or email
  auth.uid() = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid
  OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'superadmin_pt@sportiko.eu'
  )
  OR id = auth.uid() -- Allow users to see their own record if they're in the table
) 
WITH CHECK (
  -- Same check for INSERT/UPDATE
  auth.uid() = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid
  OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'superadmin_pt@sportiko.eu'
  )
);

-- Update the trainer policies to use the safe function
DROP POLICY IF EXISTS "superadmin_full_access_trainers" ON public.trainers;
DROP POLICY IF EXISTS "trainer_read_own_profile" ON public.trainers;
DROP POLICY IF EXISTS "trainer_update_own_profile" ON public.trainers;
DROP POLICY IF EXISTS "trainer_insert_own_profile" ON public.trainers;

-- Create new trainer policies using the safe superadmin check
CREATE POLICY "superadmin_all_access_trainers" 
ON public.trainers 
FOR ALL 
TO authenticated 
USING (public.is_superadmin_safe(auth.uid()))
WITH CHECK (public.is_superadmin_safe(auth.uid()));

CREATE POLICY "trainer_own_profile_access" 
ON public.trainers 
FOR SELECT 
TO authenticated 
USING (id = auth.uid() OR public.is_superadmin_safe(auth.uid()));

CREATE POLICY "trainer_own_profile_update" 
ON public.trainers 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid() OR public.is_superadmin_safe(auth.uid())) 
WITH CHECK (id = auth.uid() OR public.is_superadmin_safe(auth.uid()));

CREATE POLICY "trainer_profile_insert" 
ON public.trainers 
FOR INSERT 
TO authenticated 
WITH CHECK (id = auth.uid() OR public.is_superadmin_safe(auth.uid()));

-- Update other table policies to use the safe function
-- Shop items
DROP POLICY IF EXISTS "superadmin_full_access_shop_items" ON public.shop_items;
CREATE POLICY "superadmin_manage_shop_items" 
ON public.shop_items 
FOR ALL 
TO authenticated 
USING (public.is_superadmin_safe(auth.uid())) 
WITH CHECK (public.is_superadmin_safe(auth.uid()));

-- Ads
DROP POLICY IF EXISTS "superadmin_full_access_ads" ON public.ads;
CREATE POLICY "superadmin_manage_ads" 
ON public.ads 
FOR ALL 
TO authenticated 
USING (public.is_superadmin_safe(auth.uid())) 
WITH CHECK (public.is_superadmin_safe(auth.uid()));

-- Orders
DROP POLICY IF EXISTS "superadmin_full_access_orders" ON public.orders;
CREATE POLICY "superadmin_manage_orders" 
ON public.orders 
FOR ALL 
TO authenticated 
USING (public.is_superadmin_safe(auth.uid())) 
WITH CHECK (public.is_superadmin_safe(auth.uid()));

-- Order items
DROP POLICY IF EXISTS "superadmin_full_access_order_items" ON public.order_items;
CREATE POLICY "superadmin_manage_order_items" 
ON public.order_items 
FOR ALL 
TO authenticated 
USING (public.is_superadmin_safe(auth.uid())) 
WITH CHECK (public.is_superadmin_safe(auth.uid()));

-- Update the admin delete function
CREATE OR REPLACE FUNCTION public.admin_delete_trainer(trainer_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  user_email TEXT;
  is_superadmin_user BOOLEAN;
  trainer_exists BOOLEAN;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- If no authenticated user, return error
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found. Please ensure you are logged in.';
  END IF;

  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;

  -- Check if user is superadmin using the safe function
  is_superadmin_user := public.is_superadmin_safe(current_user_id);

  -- Log the check
  RAISE NOTICE 'Admin delete attempt by user % (%) - is_superadmin: %', 
    current_user_id, user_email, is_superadmin_user;

  -- Only allow superadmins to delete
  IF NOT is_superadmin_user THEN
    RAISE EXCEPTION 'Access denied: Only superadmins can delete trainers. User: % (%)', 
      current_user_id, user_email;
  END IF;

  -- Check if trainer exists
  SELECT EXISTS(SELECT 1 FROM public.trainers WHERE id = trainer_id) INTO trainer_exists;
  
  IF NOT trainer_exists THEN
    RAISE NOTICE 'Trainer % not found', trainer_id;
    RETURN false;
  END IF;

  -- Perform the deletion with elevated privileges
  DELETE FROM public.trainers WHERE id = trainer_id;

  -- Check if deletion was successful
  IF FOUND THEN
    RAISE NOTICE 'Successfully deleted trainer %', trainer_id;
    RETURN true;
  ELSE
    RAISE NOTICE 'Failed to delete trainer %', trainer_id;
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the debug function
CREATE OR REPLACE FUNCTION public.debug_user_auth() 
RETURNS TABLE(
  current_user_id UUID,
  user_email TEXT,
  user_name TEXT,
  is_superadmin_by_id BOOLEAN,
  is_superadmin_by_email BOOLEAN,
  in_superadmins_table BOOLEAN,
  can_delete_trainers BOOLEAN,
  session_info TEXT
) AS $$
DECLARE
  current_user_id UUID;
  user_email TEXT;
  user_name TEXT;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    SELECT u.email, u.raw_user_meta_data->>'full_name' 
    INTO user_email, user_name 
    FROM auth.users u 
    WHERE u.id = current_user_id;
  END IF;

  RETURN QUERY SELECT 
    current_user_id,
    user_email,
    user_name,
    (current_user_id = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid),
    (user_email = 'superadmin_pt@sportiko.eu'),
    public.check_superadmins_table(current_user_id),
    public.is_superadmin_safe(current_user_id),
    CASE 
      WHEN current_user_id IS NULL THEN 'No active session'
      ELSE 'Active session found'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the superadmin record exists
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_superadmin_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_superadmins_table(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_trainer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_user_auth() TO authenticated;