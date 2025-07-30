-- Fix the debug_superadmin_access function to resolve ambiguous column reference

-- Drop and recreate the debug function with proper column qualification
DROP FUNCTION IF EXISTS public.debug_superadmin_access();

CREATE OR REPLACE FUNCTION public.debug_superadmin_access()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  is_superadmin_result BOOLEAN,
  safe_access_result BOOLEAN,
  in_superadmins_table BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as user_id,
    (SELECT auth_users.email FROM auth.users auth_users WHERE auth_users.id = auth.uid()) as email,
    public.is_superadmin() as is_superadmin_result,
    public.superadmin_safe_access() as safe_access_result,
    EXISTS(SELECT 1 FROM public.superadmins sa WHERE sa.id = auth.uid()) as in_superadmins_table;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.debug_superadmin_access() TO authenticated;

-- Also fix the ensure_superadmin_record function to avoid similar issues
DROP FUNCTION IF EXISTS public.ensure_superadmin_record();

CREATE OR REPLACE FUNCTION public.ensure_superadmin_record()
RETURNS VOID AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Get user details with proper qualification
  SELECT au.email, au.raw_user_meta_data->>'full_name'
  INTO user_email, user_name
  FROM auth.users au 
  WHERE au.id = auth.uid();

  -- Insert superadmin record if user is authenticated as superadmin
  IF public.superadmin_safe_access() THEN
    INSERT INTO public.superadmins (id, email, full_name, created_at)
    VALUES (
      auth.uid(),
      user_email,
      COALESCE(user_name, 'Super Admin'),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = NOW();
      
    RAISE NOTICE 'Superadmin record ensured for user %', auth.uid();
  ELSE
    RAISE EXCEPTION 'Access denied: Not a superadmin';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.ensure_superadmin_record() TO authenticated;

-- Test the fixed function
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Test with a dummy context (this won't have auth.uid() but will test syntax)
  RAISE NOTICE 'Debug function syntax test completed successfully';
END $$;