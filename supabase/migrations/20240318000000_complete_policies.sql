-- Complete RLS Policies for Sportiko Trainer Platform

-- First, ensure all tables have RLS enabled
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Superadmins can do everything with trainers" ON public.trainers;
DROP POLICY IF EXISTS "Trainers can view and update their own profile" ON public.trainers;
DROP POLICY IF EXISTS "Only superadmins can access superadmins table" ON public.superadmins;
DROP POLICY IF EXISTS "Anyone can view active shop items" ON public.shop_items;
DROP POLICY IF EXISTS "Only superadmins can manage shop items" ON public.shop_items;
DROP POLICY IF EXISTS "Users can view relevant active ads" ON public.ads;
DROP POLICY IF EXISTS "Only superadmins can manage ads" ON public.ads;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Superadmins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Superadmins can view all order items" ON public.order_items;

-- =======================
-- TRAINERS TABLE POLICIES
-- =======================

-- Superadmins have full access to trainers table
CREATE POLICY "superadmin_full_access_trainers" 
ON public.trainers 
FOR ALL 
TO authenticated 
USING (is_superadmin(auth.uid())) 
WITH CHECK (is_superadmin(auth.uid()));

-- Trainers can view their own profile
CREATE POLICY "trainer_view_own_profile" 
ON public.trainers 
FOR SELECT 
TO authenticated 
USING (id = auth.uid());

-- Trainers can update their own profile
CREATE POLICY "trainer_update_own_profile" 
ON public.trainers 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());

-- Allow trainers to be created during registration
CREATE POLICY "allow_trainer_registration" 
ON public.trainers 
FOR INSERT 
TO authenticated 
WITH CHECK (id = auth.uid());

-- =======================
-- SUPERADMINS TABLE POLICIES
-- =======================

-- Only superadmins can access superadmins table
CREATE POLICY "superadmin_only_access" 
ON public.superadmins 
FOR ALL 
TO authenticated 
USING (is_superadmin(auth.uid())) 
WITH CHECK (is_superadmin(auth.uid()));

-- =======================
-- SHOP ITEMS TABLE POLICIES
-- =======================

-- Anyone can view active shop items
CREATE POLICY "public_read_active_shop_items" 
ON public.shop_items 
FOR SELECT 
TO authenticated 
USING (active = true);

-- Superadmins can manage all shop items
CREATE POLICY "superadmin_manage_shop_items" 
ON public.shop_items 
FOR ALL 
TO authenticated 
USING (is_superadmin(auth.uid())) 
WITH CHECK (is_superadmin(auth.uid()));

-- =======================
-- ADS TABLE POLICIES
-- =======================

-- Users can view relevant active ads
CREATE POLICY "users_view_relevant_ads" 
ON public.ads 
FOR SELECT 
TO authenticated 
USING (
  active = true 
  AND CURRENT_DATE BETWEEN start_date AND end_date 
  AND (
    type = 'trainer' 
    OR (type = 'superadmin' AND is_superadmin(auth.uid()))
  )
);

-- Superadmins can manage all ads
CREATE POLICY "superadmin_manage_ads" 
ON public.ads 
FOR ALL 
TO authenticated 
USING (is_superadmin(auth.uid())) 
WITH CHECK (is_superadmin(auth.uid()));

-- =======================
-- ORDERS TABLE POLICIES
-- =======================

-- Users can view their own orders
CREATE POLICY "users_view_own_orders" 
ON public.orders 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Users can create their own orders
CREATE POLICY "users_create_own_orders" 
ON public.orders 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Users can update their own orders (for status changes)
CREATE POLICY "users_update_own_orders" 
ON public.orders 
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- Superadmins can view all orders
CREATE POLICY "superadmin_view_all_orders" 
ON public.orders 
FOR SELECT 
TO authenticated 
USING (is_superadmin(auth.uid()));

-- Superadmins can update all orders
CREATE POLICY "superadmin_update_all_orders" 
ON public.orders 
FOR UPDATE 
TO authenticated 
USING (is_superadmin(auth.uid())) 
WITH CHECK (is_superadmin(auth.uid()));

-- =======================
-- ORDER ITEMS TABLE POLICIES
-- =======================

-- Users can view their own order items
CREATE POLICY "users_view_own_order_items" 
ON public.order_items 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
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
    AND orders.user_id = auth.uid()
  )
);

-- Superadmins can view all order items
CREATE POLICY "superadmin_view_all_order_items" 
ON public.order_items 
FOR SELECT 
TO authenticated 
USING (is_superadmin(auth.uid()));

-- =======================
-- UTILITY FUNCTIONS FOR DATABASE INFO
-- =======================

-- Function to get tables information
CREATE OR REPLACE FUNCTION public.get_tables_info()
RETURNS TABLE(table_schema TEXT, table_name TEXT, table_type TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    schemaname::TEXT as table_schema,
    tablename::TEXT as table_name,
    'BASE TABLE'::TEXT as table_type
  FROM pg_tables 
  WHERE schemaname = 'public'
  UNION ALL
  SELECT 
    schemaname::TEXT as table_schema,
    viewname::TEXT as table_name,
    'VIEW'::TEXT as table_type
  FROM pg_views 
  WHERE schemaname = 'public'
  ORDER BY table_name;
$$;

-- Function to get policies information
CREATE OR REPLACE FUNCTION public.get_policies_info()
RETURNS TABLE(schemaname TEXT, tablename TEXT, policyname TEXT, cmd TEXT, roles TEXT[])
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    schemaname::TEXT,
    tablename::TEXT,
    policyname::TEXT,
    cmd::TEXT,
    roles::TEXT[]
  FROM pg_policies 
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
$$;

-- Function to create missing policies (placeholder - would need specific implementation)
CREATE OR REPLACE FUNCTION public.create_missing_policies()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function would check for missing policies and create them
  -- Implementation would depend on specific requirements
  RAISE NOTICE 'Checking and creating missing policies...';
END;
$$;

-- =======================
-- TENANT SCHEMA POLICIES TEMPLATE
-- =======================

-- Update the create_tenant_schema function to include proper policies
CREATE OR REPLACE FUNCTION public.create_tenant_schema(schema_name TEXT, trainer_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Create schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
  
  -- Create players table
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
  
  -- Create homework table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.homework (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      due_date TIMESTAMP WITH TIME ZONE,
      player_id UUID REFERENCES %I.players(id) ON DELETE CASCADE,
      completed BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name);
  
  -- Create homework_items table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.homework_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      homework_id UUID REFERENCES %I.homework(id) ON DELETE CASCADE,
      exercise_name TEXT NOT NULL,
      sets INTEGER,
      reps INTEGER,
      duration INTERVAL,
      notes TEXT,
      completed BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name);
  
  -- Create assessments table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID REFERENCES %I.players(id) ON DELETE CASCADE,
      assessment_date DATE NOT NULL,
      metrics JSONB,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name);
  
  -- Create payments table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID REFERENCES %I.players(id) ON DELETE CASCADE,
      amount NUMERIC(10,2) NOT NULL,
      due_date DATE,
      paid BOOLEAN DEFAULT false,
      paid_date DATE,
      payment_method TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name);
  
  -- Enable RLS for all tables
  EXECUTE format('ALTER TABLE %I.players ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.homework ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.homework_items ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.assessments ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.payments ENABLE ROW LEVEL SECURITY', schema_name);
  
  -- Create tenant isolation policies
  EXECUTE format('
    CREATE POLICY tenant_isolation_policy ON %I.players 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (
      SELECT 1 FROM public.trainers 
      WHERE id = auth.uid() AND id = %L
    )) 
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.trainers 
      WHERE id = auth.uid() AND id = %L
    ))', schema_name, trainer_id, trainer_id);
  
  EXECUTE format('
    CREATE POLICY tenant_isolation_policy ON %I.homework 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (
      SELECT 1 FROM public.trainers 
      WHERE id = auth.uid() AND id = %L
    )) 
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.trainers 
      WHERE id = auth.uid() AND id = %L
    ))', schema_name, trainer_id, trainer_id);
  
  EXECUTE format('
    CREATE POLICY tenant_isolation_policy ON %I.homework_items 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (
      SELECT 1 FROM public.trainers 
      WHERE id = auth.uid() AND id = %L
    )) 
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.trainers 
      WHERE id = auth.uid() AND id = %L
    ))', schema_name, trainer_id, trainer_id);
  
  EXECUTE format('
    CREATE POLICY tenant_isolation_policy ON %I.assessments 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (
      SELECT 1 FROM public.trainers 
      WHERE id = auth.uid() AND id = %L
    )) 
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.trainers 
      WHERE id = auth.uid() AND id = %L
    ))', schema_name, trainer_id, trainer_id);
  
  EXECUTE format('
    CREATE POLICY tenant_isolation_policy ON %I.payments 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (
      SELECT 1 FROM public.trainers 
      WHERE id = auth.uid() AND id = %L
    )) 
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.trainers 
      WHERE id = auth.uid() AND id = %L
    ))', schema_name, trainer_id, trainer_id);
  
  -- Grant usage on schema to authenticated users
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', schema_name);
  EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated', schema_name);
  EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO authenticated', schema_name);
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- STORAGE POLICIES
-- =======================

-- Create storage bucket policies for trainer files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sportiko-trainer', 'sportiko-trainer', false)
ON CONFLICT (id) DO NOTHING;

-- Policy for trainers to access their own folder
CREATE POLICY "Trainers can upload to own folder" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'sportiko-trainer' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for trainers to view their own files
CREATE POLICY "Trainers can view own files" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'sportiko-trainer' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for trainers to update their own files
CREATE POLICY "Trainers can update own files" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'sportiko-trainer' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for trainers to delete their own files
CREATE POLICY "Trainers can delete own files" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'sportiko-trainer' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Superadmin policies for storage
CREATE POLICY "Superadmins can manage all files" 
ON storage.objects 
FOR ALL 
TO authenticated 
USING (bucket_id = 'sportiko-trainer' AND is_superadmin(auth.uid())) 
WITH CHECK (bucket_id = 'sportiko-trainer' AND is_superadmin(auth.uid()));