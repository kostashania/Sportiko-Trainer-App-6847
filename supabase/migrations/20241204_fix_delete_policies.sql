-- Ensure DELETE operations work for superadmins

-- Add explicit DELETE policy for trainers table
CREATE POLICY "superadmin_delete_trainers" ON public.trainers
FOR DELETE TO authenticated
USING (public.superadmin_safe_access());

-- Also fix other tables that might have similar issues

-- Shop items
DROP POLICY IF EXISTS "Only superadmins can manage shop items" ON public.shop_items;
DROP POLICY IF EXISTS "superadmin_manage_shop_items" ON public.shop_items;

CREATE POLICY "superadmin_full_access_shop_items" ON public.shop_items
FOR ALL TO authenticated
USING (public.superadmin_safe_access())
WITH CHECK (public.superadmin_safe_access());

-- Ads
DROP POLICY IF EXISTS "Only superadmins can manage ads" ON public.ads;
DROP POLICY IF EXISTS "superadmin_manage_ads" ON public.ads;

CREATE POLICY "superadmin_full_access_ads" ON public.ads
FOR ALL TO authenticated
USING (public.superadmin_safe_access())
WITH CHECK (public.superadmin_safe_access());

-- Orders
DROP POLICY IF EXISTS "Superadmins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Superadmins can update all orders" ON public.orders;
DROP POLICY IF EXISTS "superadmin_view_all_orders" ON public.orders;
DROP POLICY IF EXISTS "superadmin_update_all_orders" ON public.orders;

CREATE POLICY "superadmin_full_access_orders" ON public.orders
FOR ALL TO authenticated
USING (public.superadmin_safe_access())
WITH CHECK (public.superadmin_safe_access());

-- Order items
DROP POLICY IF EXISTS "Superadmins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "superadmin_view_all_order_items" ON public.order_items;

CREATE POLICY "superadmin_full_access_order_items" ON public.order_items
FOR ALL TO authenticated
USING (public.superadmin_safe_access())
WITH CHECK (public.superadmin_safe_access());

-- Create a debug function to test policies
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
    (SELECT email FROM auth.users WHERE id = auth.uid()) as email,
    public.is_superadmin() as is_superadmin_result,
    public.superadmin_safe_access() as safe_access_result,
    EXISTS(SELECT 1 FROM public.superadmins WHERE id = auth.uid()) as in_superadmins_table;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.debug_superadmin_access() TO authenticated;

-- Create a function to fix missing superadmin record
CREATE OR REPLACE FUNCTION public.ensure_superadmin_record()
RETURNS VOID AS $$
BEGIN
  -- Insert superadmin record if user is authenticated as superadmin
  IF public.superadmin_safe_access() THEN
    INSERT INTO public.superadmins (id, email, full_name, created_at)
    VALUES (
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      COALESCE(
        (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = auth.uid()),
        'Super Admin'
      ),
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

GRANT EXECUTE ON FUNCTION public.ensure_superadmin_record() TO authenticated;