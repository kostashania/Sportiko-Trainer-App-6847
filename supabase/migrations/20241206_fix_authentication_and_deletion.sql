-- Fix authentication and deletion issues for trainer management

-- First, let's create a more robust superadmin detection function
CREATE OR REPLACE FUNCTION public.is_superadmin_by_email_or_id(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- If no user_id provided, return false
  IF check_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is the known superadmin ID
  IF check_user_id = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid THEN
    RETURN true;
  END IF;
  
  -- Check if user has superadmin email
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = check_user_id 
    AND email = 'superadmin_pt@sportiko.eu'
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user exists in superadmins table
  IF EXISTS (
    SELECT 1 FROM public.superadmins 
    WHERE id = check_user_id
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function that bypasses RLS for superadmin operations
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
  
  -- If no authenticated user, check if this is a demo scenario
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found. Please ensure you are logged in.';
  END IF;
  
  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
  
  -- Check if user is superadmin
  is_superadmin_user := public.is_superadmin_by_email_or_id(current_user_id);
  
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

-- Create a function to fix missing superadmin records
CREATE OR REPLACE FUNCTION public.ensure_superadmin_record()
RETURNS VOID AS $$
DECLARE
  current_user_id UUID;
  user_email TEXT;
  user_name TEXT;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;
  
  -- Get user details
  SELECT email, raw_user_meta_data->>'full_name' 
  INTO user_email, user_name
  FROM auth.users 
  WHERE id = current_user_id;
  
  -- Check if this user should be a superadmin
  IF current_user_id = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid 
     OR user_email = 'superadmin_pt@sportiko.eu' THEN
    
    -- Insert or update superadmin record
    INSERT INTO public.superadmins (id, email, full_name, created_at)
    VALUES (
      current_user_id,
      user_email,
      COALESCE(user_name, 'Super Admin'),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = NOW();
    
    RAISE NOTICE 'Superadmin record ensured for user % (%)', current_user_id, user_email;
  ELSE
    RAISE EXCEPTION 'User % (%) is not authorized to be a superadmin', current_user_id, user_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a comprehensive debug function
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
    EXISTS(SELECT 1 FROM public.superadmins WHERE id = current_user_id),
    public.is_superadmin_by_email_or_id(current_user_id),
    CASE 
      WHEN current_user_id IS NULL THEN 'No active session'
      ELSE 'Active session found'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trainer policies to be more permissive for superadmins
DROP POLICY IF EXISTS "superadmin_complete_access" ON public.trainers;
DROP POLICY IF EXISTS "trainer_own_profile_access" ON public.trainers;
DROP POLICY IF EXISTS "trainer_own_profile_update" ON public.trainers;
DROP POLICY IF EXISTS "trainer_registration" ON public.trainers;

-- Create new policies that are more explicit
CREATE POLICY "superadmin_full_access_trainers" 
ON public.trainers FOR ALL TO authenticated 
USING (public.is_superadmin_by_email_or_id(auth.uid()))
WITH CHECK (public.is_superadmin_by_email_or_id(auth.uid()));

CREATE POLICY "trainer_read_own_profile" 
ON public.trainers FOR SELECT TO authenticated 
USING (id = auth.uid());

CREATE POLICY "trainer_update_own_profile" 
ON public.trainers FOR UPDATE TO authenticated 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());

CREATE POLICY "trainer_insert_own_profile" 
ON public.trainers FOR INSERT TO authenticated 
WITH CHECK (id = auth.uid());

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
GRANT EXECUTE ON FUNCTION public.is_superadmin_by_email_or_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_trainer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_superadmin_record() TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_user_auth() TO authenticated;

-- Create a function to refresh the current session (for demo purposes)
CREATE OR REPLACE FUNCTION public.refresh_demo_session()
RETURNS TEXT AS $$
BEGIN
  -- This is a placeholder function for demo purposes
  -- In a real scenario, session refresh would be handled by the client
  RETURN 'Session refresh attempted. Please check your authentication status.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_demo_session() TO authenticated;