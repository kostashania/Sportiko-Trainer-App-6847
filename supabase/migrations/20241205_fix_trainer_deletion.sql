-- Fix trainer deletion by creating a comprehensive policy that allows superadmin deletion

-- First, let's check what policies currently exist and drop them
DROP POLICY IF EXISTS "superadmin_all_access_trainers" ON public.trainers;
DROP POLICY IF EXISTS "trainer_own_profile_select" ON public.trainers;
DROP POLICY IF EXISTS "trainer_own_profile_update" ON public.trainers;
DROP POLICY IF EXISTS "trainer_registration_insert" ON public.trainers;
DROP POLICY IF EXISTS "Superadmins can do everything with trainers" ON public.trainers;
DROP POLICY IF EXISTS "superadmin_full_access_trainers" ON public.trainers;
DROP POLICY IF EXISTS "superadmin_delete_trainers" ON public.trainers;

-- Create a single comprehensive policy for superadmins that covers ALL operations
CREATE POLICY "superadmin_complete_access" 
ON public.trainers 
FOR ALL 
TO authenticated 
USING (
  -- Allow access if user is superadmin (any of these conditions)
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
) 
WITH CHECK (
  -- Same check for INSERT/UPDATE operations
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

-- Create separate policies for trainers to manage their own profiles
CREATE POLICY "trainer_own_profile_access" 
ON public.trainers 
FOR SELECT 
TO authenticated 
USING (id = auth.uid());

CREATE POLICY "trainer_own_profile_update" 
ON public.trainers 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());

CREATE POLICY "trainer_registration" 
ON public.trainers 
FOR INSERT 
TO authenticated 
WITH CHECK (id = auth.uid());

-- Create a test function to verify deletion access
CREATE OR REPLACE FUNCTION public.test_trainer_deletion_access(trainer_id_to_delete UUID)
RETURNS TABLE(
  can_delete BOOLEAN,
  user_id UUID,
  is_superadmin_by_id BOOLEAN,
  is_superadmin_by_email BOOLEAN,
  is_in_superadmins_table BOOLEAN,
  policy_result BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Test if deletion would be allowed
    (
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
    ) as can_delete,
    auth.uid() as user_id,
    (auth.uid() = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid) as is_superadmin_by_id,
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'superadmin_pt@sportiko.eu'
    ) as is_superadmin_by_email,
    EXISTS (
      SELECT 1 FROM public.superadmins 
      WHERE id = auth.uid()
    ) as is_in_superadmins_table,
    public.superadmin_safe_access() as policy_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.test_trainer_deletion_access(UUID) TO authenticated;

-- Also create a function to force delete a trainer (for emergency use)
CREATE OR REPLACE FUNCTION public.force_delete_trainer(trainer_id_to_delete UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Only allow if user is definitely a superadmin
  IF NOT (
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
  ) THEN
    RAISE EXCEPTION 'Access denied: Only superadmins can force delete trainers';
  END IF;

  -- Perform the deletion
  DELETE FROM public.trainers WHERE id = trainer_id_to_delete;
  
  -- Return success
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.force_delete_trainer(UUID) TO authenticated;

-- Let's also ensure the superadmin record exists
INSERT INTO public.superadmins (id, email, full_name, created_at)
VALUES (
  'be9c6165-808a-4335-b90e-22f6d20328bf',
  'superadmin_pt@sportiko.eu',
  'Super Admin',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Add some debug logging
CREATE OR REPLACE FUNCTION public.debug_trainer_deletion(trainer_id_to_delete UUID)
RETURNS TEXT AS $$
DECLARE
  debug_info TEXT;
  current_user_id UUID;
  user_email TEXT;
  trainer_exists BOOLEAN;
  policy_allows BOOLEAN;
BEGIN
  current_user_id := auth.uid();
  
  SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
  
  SELECT EXISTS(SELECT 1 FROM public.trainers WHERE id = trainer_id_to_delete) INTO trainer_exists;
  
  SELECT (
    current_user_id = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid OR
    user_email = 'superadmin_pt@sportiko.eu' OR
    EXISTS (SELECT 1 FROM public.superadmins WHERE id = current_user_id)
  ) INTO policy_allows;
  
  debug_info := format(
    'Debug Info:
    - Current User ID: %s
    - User Email: %s
    - Trainer to Delete: %s
    - Trainer Exists: %s
    - Policy Allows: %s
    - Is Hardcoded Superadmin: %s
    - Has Superadmin Email: %s
    - In Superadmins Table: %s',
    current_user_id,
    user_email,
    trainer_id_to_delete,
    trainer_exists,
    policy_allows,
    (current_user_id = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid),
    (user_email = 'superadmin_pt@sportiko.eu'),
    EXISTS (SELECT 1 FROM public.superadmins WHERE id = current_user_id)
  );
  
  RETURN debug_info;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.debug_trainer_deletion(UUID) TO authenticated;