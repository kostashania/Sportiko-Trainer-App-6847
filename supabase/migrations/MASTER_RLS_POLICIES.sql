-- ===================================================================
-- MASTER RLS POLICIES FILE - SPORTIKO TRAINER PLATFORM
-- ===================================================================
-- 
-- ⚠️  IMPORTANT INSTRUCTION FOR GRETA:
-- This is the MASTER file for all RLS policies in the Sportiko platform.
-- ALWAYS update this file when making ANY changes to database policies.
-- This file should be the single source of truth for all RLS configurations.
-- 
-- Last Updated: 2024-12-30
-- ===================================================================

-- ===================================================================
-- HELPER FUNCTIONS
-- ===================================================================

-- Safe superadmin check (no recursion)
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
  
  -- Check by known superadmin email (no recursion)
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id AND email = 'superadmin_pt@sportiko.eu'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check superadmins table without recursion
CREATE OR REPLACE FUNCTION public.check_superadmins_table(user_id UUID DEFAULT auth.uid()) 
RETURNS BOOLEAN AS $$
BEGIN
  -- This function bypasses RLS to check the superadmins table
  RETURN EXISTS (
    SELECT 1 FROM public.superadmins 
    WHERE id = COALESCE(user_id, auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main is_superadmin function
CREATE OR REPLACE FUNCTION public.is_superadmin(user_id UUID DEFAULT auth.uid()) 
RETURNS BOOLEAN AS $$
BEGIN
  -- First check if user is superadmin by ID or email (no table lookup)
  IF public.is_superadmin_safe(user_id) THEN
    RETURN true;
  END IF;
  
  -- Then check the superadmins table (bypasses RLS)
  RETURN public.check_superadmins_table(user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is trainer
CREATE OR REPLACE FUNCTION public.is_trainer(user_id UUID DEFAULT auth.uid()) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trainers 
    WHERE id = COALESCE(user_id, auth.uid()) AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- ENABLE RLS ON ALL TABLES
-- ===================================================================

ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- DROP ALL EXISTING POLICIES (Clean Slate)
-- ===================================================================

-- Trainers table
DROP POLICY IF EXISTS "superadmin_all_access_trainers" ON public.trainers;
DROP POLICY IF EXISTS "trainer_own_profile_access" ON public.trainers;
DROP POLICY IF EXISTS "trainer_own_profile_update" ON public.trainers;
DROP POLICY IF EXISTS "trainer_profile_insert" ON public.trainers;
DROP POLICY IF EXISTS "superadmin_complete_access" ON public.trainers;
DROP POLICY IF EXISTS "trainer_read_own_profile" ON public.trainers;
DROP POLICY IF EXISTS "trainer_update_own_profile" ON public.trainers;
DROP POLICY IF EXISTS "trainer_insert_own_profile" ON public.trainers;

-- Superadmins table
DROP POLICY IF EXISTS "superadmin_access_by_id_or_email" ON public.superadmins;
DROP POLICY IF EXISTS "superadmin_safe_access_policy" ON public.superadmins;
DROP POLICY IF EXISTS "superadmin_only_access" ON public.superadmins;

-- Shop items table
DROP POLICY IF EXISTS "public_read_active_shop_items" ON public.shop_items;
DROP POLICY IF EXISTS "superadmin_manage_shop_items" ON public.shop_items;
DROP POLICY IF EXISTS "superadmin_full_access_shop_items" ON public.shop_items;

-- Ads table
DROP POLICY IF EXISTS "users_view_relevant_ads" ON public.ads;
DROP POLICY IF EXISTS "superadmin_manage_ads" ON public.ads;
DROP POLICY IF EXISTS "superadmin_full_access_ads" ON public.ads;

-- Orders table
DROP POLICY IF EXISTS "users_view_own_orders" ON public.orders;
DROP POLICY IF EXISTS "users_create_own_orders" ON public.orders;
DROP POLICY IF EXISTS "users_update_own_orders" ON public.orders;
DROP POLICY IF EXISTS "superadmin_manage_orders" ON public.orders;
DROP POLICY IF EXISTS "superadmin_full_access_orders" ON public.orders;

-- Order items table
DROP POLICY IF EXISTS "users_view_own_order_items" ON public.order_items;
DROP POLICY IF EXISTS "users_create_own_order_items" ON public.order_items;
DROP POLICY IF EXISTS "superadmin_manage_order_items" ON public.order_items;
DROP POLICY IF EXISTS "superadmin_full_access_order_items" ON public.order_items;

-- ===================================================================
-- TRAINERS TABLE POLICIES
-- ===================================================================

-- Superadmins have complete access to all trainers
CREATE POLICY "superadmin_all_access_trainers" 
ON public.trainers 
FOR ALL 
TO authenticated 
USING (public.is_superadmin_safe(auth.uid())) 
WITH CHECK (public.is_superadmin_safe(auth.uid()));

-- Trainers can view their own profile
CREATE POLICY "trainer_view_own_profile" 
ON public.trainers 
FOR SELECT 
TO authenticated 
USING (id = auth.uid() OR public.is_superadmin_safe(auth.uid()));

-- Trainers can update their own profile
CREATE POLICY "trainer_update_own_profile" 
ON public.trainers 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid() OR public.is_superadmin_safe(auth.uid())) 
WITH CHECK (id = auth.uid() OR public.is_superadmin_safe(auth.uid()));

-- Allow trainer registration (insert)
CREATE POLICY "trainer_registration_insert" 
ON public.trainers 
FOR INSERT 
TO authenticated 
WITH CHECK (id = auth.uid() OR public.is_superadmin_safe(auth.uid()));

-- ===================================================================
-- SUPERADMINS TABLE POLICIES
-- ===================================================================

-- Superadmins table access (no recursion)
CREATE POLICY "superadmin_table_access" 
ON public.superadmins 
FOR ALL 
TO authenticated 
USING (
  -- Allow access if user is the known superadmin ID or email
  auth.uid() = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() AND email = 'superadmin_pt@sportiko.eu'
  ) OR
  id = auth.uid() -- Allow users to see their own record if they're in the table
) 
WITH CHECK (
  -- Same check for INSERT/UPDATE
  auth.uid() = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() AND email = 'superadmin_pt@sportiko.eu'
  )
);

-- ===================================================================
-- SHOP ITEMS TABLE POLICIES
-- ===================================================================

-- Anyone can view active shop items
CREATE POLICY "public_view_active_shop_items" 
ON public.shop_items 
FOR SELECT 
TO authenticated 
USING (active = true);

-- Superadmins can manage all shop items
CREATE POLICY "superadmin_manage_shop_items" 
ON public.shop_items 
FOR ALL 
TO authenticated 
USING (public.is_superadmin_safe(auth.uid())) 
WITH CHECK (public.is_superadmin_safe(auth.uid()));

-- ===================================================================
-- ADS TABLE POLICIES
-- ===================================================================

-- Users can view relevant active ads
CREATE POLICY "users_view_active_ads" 
ON public.ads 
FOR SELECT 
TO authenticated 
USING (
  active = true AND 
  CURRENT_DATE BETWEEN start_date AND end_date AND
  (
    type = 'trainer' OR 
    (type = 'superadmin' AND public.is_superadmin_safe(auth.uid()))
  )
);

-- Superadmins can manage all ads
CREATE POLICY "superadmin_manage_all_ads" 
ON public.ads 
FOR ALL 
TO authenticated 
USING (public.is_superadmin_safe(auth.uid())) 
WITH CHECK (public.is_superadmin_safe(auth.uid()));

-- ===================================================================
-- ORDERS TABLE POLICIES
-- ===================================================================

-- Users can view their own orders
CREATE POLICY "users_view_own_orders" 
ON public.orders 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR public.is_superadmin_safe(auth.uid()));

-- Users can create their own orders
CREATE POLICY "users_create_own_orders" 
ON public.orders 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid() OR public.is_superadmin_safe(auth.uid()));

-- Users can update their own orders
CREATE POLICY "users_update_own_orders" 
ON public.orders 
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid() OR public.is_superadmin_safe(auth.uid())) 
WITH CHECK (user_id = auth.uid() OR public.is_superadmin_safe(auth.uid()));

-- Superadmins can delete orders
CREATE POLICY "superadmin_delete_orders" 
ON public.orders 
FOR DELETE 
TO authenticated 
USING (public.is_superadmin_safe(auth.uid()));

-- ===================================================================
-- ORDER ITEMS TABLE POLICIES
-- ===================================================================

-- Users can view their own order items
CREATE POLICY "users_view_own_order_items" 
ON public.order_items 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR public.is_superadmin_safe(auth.uid()))
  )
);

-- Users can create their own order items
CREATE POLICY "users_create_own_order_items" 
ON public.order_items 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR public.is_superadmin_safe(auth.uid()))
  )
);

-- Users can update their own order items
CREATE POLICY "users_update_own_order_items" 
ON public.order_items 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR public.is_superadmin_safe(auth.uid()))
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR public.is_superadmin_safe(auth.uid()))
  )
);

-- Superadmins can delete order items
CREATE POLICY "superadmin_delete_order_items" 
ON public.order_items 
FOR DELETE 
TO authenticated 
USING (public.is_superadmin_safe(auth.uid()));

-- ===================================================================
-- STORAGE POLICIES
-- ===================================================================

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('shop-images', 'shop-images', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('ads-images', 'ads-images', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Superadmins can manage all files" ON storage.objects;

-- Avatar storage policies
CREATE POLICY "users_upload_own_avatar" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "users_read_own_avatar" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "users_update_own_avatar" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "users_delete_own_avatar" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Superadmin storage policies (all buckets)
CREATE POLICY "superadmin_manage_all_storage" 
ON storage.objects 
FOR ALL 
TO authenticated 
USING (
  bucket_id IN ('avatars', 'shop-images', 'ads-images') AND 
  public.is_superadmin_safe(auth.uid())
) 
WITH CHECK (
  bucket_id IN ('avatars', 'shop-images', 'ads-images') AND 
  public.is_superadmin_safe(auth.uid())
);

-- ===================================================================
-- TENANT SCHEMA POLICIES TEMPLATE
-- ===================================================================

-- Function to create tenant schema with proper policies
CREATE OR REPLACE FUNCTION public.create_tenant_schema_with_policies(trainer_id UUID) 
RETURNS VOID AS $$
DECLARE
  schema_name TEXT := 'pt_' || replace(trainer_id::text, '-', '_');
  policy_exists BOOLEAN;
BEGIN
  -- Only allow superadmins to create schemas
  IF NOT public.is_superadmin_safe() THEN
    RAISE EXCEPTION 'Only superadmins can create tenant schemas';
  END IF;

  -- Create schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);

  -- Create tables (players, homework, assessments, etc.)
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.players (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      birth_date DATE,
      position TEXT,
      contact TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name);

  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.homework (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID REFERENCES %I.players(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      due_date TIMESTAMP WITH TIME ZONE,
      completed BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name);

  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID REFERENCES %I.players(id) ON DELETE CASCADE,
      amount NUMERIC(10,2) NOT NULL,
      due_date DATE,
      paid BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name);

  -- Enable RLS
  EXECUTE format('ALTER TABLE %I.players ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.homework ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.payments ENABLE ROW LEVEL SECURITY', schema_name);

  -- Create policies for trainer access
  EXECUTE format('
    CREATE POLICY "trainer_all_access" ON %I.players 
    FOR ALL TO authenticated 
    USING (auth.uid() = %L) 
    WITH CHECK (auth.uid() = %L)
  ', schema_name, trainer_id, trainer_id);

  EXECUTE format('
    CREATE POLICY "trainer_all_access" ON %I.homework 
    FOR ALL TO authenticated 
    USING (auth.uid() = %L) 
    WITH CHECK (auth.uid() = %L)
  ', schema_name, trainer_id, trainer_id);

  EXECUTE format('
    CREATE POLICY "trainer_all_access" ON %I.payments 
    FOR ALL TO authenticated 
    USING (auth.uid() = %L) 
    WITH CHECK (auth.uid() = %L)
  ', schema_name, trainer_id, trainer_id);

  -- Grant permissions
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', schema_name);
  EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated', schema_name);
  EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO authenticated', schema_name);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- ADMIN FUNCTIONS
-- ===================================================================

-- Admin function to delete trainers (bypasses RLS)
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

  -- Perform the deletion
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

-- ===================================================================
-- GRANT PERMISSIONS
-- ===================================================================

GRANT EXECUTE ON FUNCTION public.is_superadmin_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_superadmins_table(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trainer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tenant_schema_with_policies(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_trainer(UUID) TO authenticated;

-- ===================================================================
-- ENSURE REQUIRED DATA EXISTS
-- ===================================================================

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

-- ===================================================================
-- END OF MASTER RLS POLICIES FILE
-- ===================================================================