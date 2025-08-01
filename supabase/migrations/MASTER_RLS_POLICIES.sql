--===================================================================
-- MASTER RLS POLICIES FILE - SPORTIKO TRAINER PLATFORM
--===================================================================
--
-- ⚠️ IMPORTANT INSTRUCTION FOR GRETA:
-- This is the MASTER file for all RLS policies in the Sportiko platform.
-- ALWAYS update this file when making ANY changes to database policies.
-- This file should be the single source of truth for all RLS configurations.
--
-- Last Updated: 2024-12-30 - Major schema restructure to dedicated sportiko_trainer schema
--===================================================================

--===================================================================
-- SCHEMA STRUCTURE OVERVIEW
--===================================================================
-- 
-- sportiko_trainer/           # Main app schema (replaces public for app tables)
-- ├── trainers               # Trainer profiles
-- ├── superadmins           # Superadmin users  
-- ├── shop_items            # E-commerce products
-- ├── ads                   # Advertisement system
-- ├── orders                # Order management
-- ├── order_items           # Order line items
-- ├── subscription_plans    # Available plans
-- └── subscription_history  # Audit trail
--
-- st_{trainer_id}/           # Per-trainer schemas (replaces pt_ prefix)
-- ├── players               # Player profiles
-- ├── homework              # Assignments
-- ├── payments              # Payment tracking
-- └── assessments           # Performance data
--
-- public/                    # Shared utilities only
-- ├── Helper functions only
-- └── Cross-app utilities

--===================================================================
-- CREATE DEDICATED SCHEMA
--===================================================================

-- Create dedicated schema for Sportiko Trainer app
CREATE SCHEMA IF NOT EXISTS sportiko_trainer;

--===================================================================
-- HELPER FUNCTIONS
--===================================================================

-- Safe superadmin check for sportiko_trainer schema (no recursion)
CREATE OR REPLACE FUNCTION sportiko_trainer.is_superadmin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- If no user_id provided, return false
  IF user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check by known superadmin ID first
  IF user_id = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid THEN
    RETURN true;
  END IF;

  -- Check by known superadmin email
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND email = 'superadmin_pt@sportiko.eu'
  ) THEN
    RETURN true;
  END IF;

  -- Check if user exists in superadmins table
  RETURN EXISTS (
    SELECT 1 FROM sportiko_trainer.superadmins 
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is trainer
CREATE OR REPLACE FUNCTION sportiko_trainer.is_trainer(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sportiko_trainer.trainers 
    WHERE id = COALESCE(user_id, auth.uid()) 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--===================================================================
-- CREATE TABLES IN DEDICATED SCHEMA
--===================================================================

-- Trainers table (app-specific)
CREATE TABLE IF NOT EXISTS sportiko_trainer.trainers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  bio TEXT,
  phone TEXT,
  avatar_url TEXT,
  subscription_plan TEXT DEFAULT 'basic',
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'expired')),
  subscription_start TIMESTAMP WITH TIME ZONE,
  subscription_end TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  trial_end TIMESTAMP WITH TIME ZONE,
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Superadmins table (app-specific)
CREATE TABLE IF NOT EXISTS sportiko_trainer.superadmins (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  bio TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shop items table (app-specific)
CREATE TABLE IF NOT EXISTS sportiko_trainer.shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category TEXT,
  stock_quantity INTEGER DEFAULT 0,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ads table (app-specific)
CREATE TABLE IF NOT EXISTS sportiko_trainer.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link TEXT,
  type TEXT NOT NULL CHECK (type IN ('superadmin', 'trainer')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders table (app-specific)
CREATE TABLE IF NOT EXISTS sportiko_trainer.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  total_amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order items table (app-specific)
CREATE TABLE IF NOT EXISTS sportiko_trainer.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES sportiko_trainer.orders(id),
  shop_item_id UUID REFERENCES sportiko_trainer.shop_items(id),
  quantity INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscription plans table (app-specific)
CREATE TABLE IF NOT EXISTS sportiko_trainer.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscription history table (app-specific)
CREATE TABLE IF NOT EXISTS sportiko_trainer.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES sportiko_trainer.trainers(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_plan TEXT,
  new_plan TEXT,
  old_status TEXT,
  new_status TEXT,
  old_end_date TIMESTAMP WITH TIME ZONE,
  new_end_date TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--===================================================================
-- ENABLE RLS ON ALL TABLES
--===================================================================

ALTER TABLE sportiko_trainer.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.subscription_history ENABLE ROW LEVEL SECURITY;

--===================================================================
-- DROP ALL EXISTING POLICIES (Clean Slate)
--===================================================================

-- Trainers table
DROP POLICY IF EXISTS "superadmin_full_access_trainers" ON sportiko_trainer.trainers;
DROP POLICY IF EXISTS "trainer_own_profile_access" ON sportiko_trainer.trainers;
DROP POLICY IF EXISTS "trainer_own_profile_update" ON sportiko_trainer.trainers;
DROP POLICY IF EXISTS "trainer_registration" ON sportiko_trainer.trainers;

-- Superadmins table
DROP POLICY IF EXISTS "superadmin_table_access" ON sportiko_trainer.superadmins;

-- Shop items table
DROP POLICY IF EXISTS "public_view_active_shop_items" ON sportiko_trainer.shop_items;
DROP POLICY IF EXISTS "superadmin_manage_shop_items" ON sportiko_trainer.shop_items;

-- Ads table
DROP POLICY IF EXISTS "users_view_active_ads" ON sportiko_trainer.ads;
DROP POLICY IF EXISTS "superadmin_manage_ads" ON sportiko_trainer.ads;

-- Orders table
DROP POLICY IF EXISTS "users_view_own_orders" ON sportiko_trainer.orders;
DROP POLICY IF EXISTS "users_create_own_orders" ON sportiko_trainer.orders;
DROP POLICY IF EXISTS "users_update_own_orders" ON sportiko_trainer.orders;
DROP POLICY IF EXISTS "superadmin_delete_orders" ON sportiko_trainer.orders;

-- Order items table
DROP POLICY IF EXISTS "users_view_own_order_items" ON sportiko_trainer.order_items;
DROP POLICY IF EXISTS "users_create_own_order_items" ON sportiko_trainer.order_items;

-- Subscription plans table
DROP POLICY IF EXISTS "public_view_active_subscription_plans" ON sportiko_trainer.subscription_plans;
DROP POLICY IF EXISTS "superadmin_manage_subscription_plans" ON sportiko_trainer.subscription_plans;

-- Subscription history table
DROP POLICY IF EXISTS "trainers_view_own_subscription_history" ON sportiko_trainer.subscription_history;
DROP POLICY IF EXISTS "superadmin_manage_subscription_history" ON sportiko_trainer.subscription_history;

--===================================================================
-- TRAINERS TABLE POLICIES
--===================================================================

-- Superadmins have complete access to all trainers
CREATE POLICY "superadmin_full_access_trainers" 
ON sportiko_trainer.trainers FOR ALL TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid())) 
WITH CHECK (sportiko_trainer.is_superadmin(auth.uid()));

-- Trainers can view their own profile
CREATE POLICY "trainer_own_profile_access" 
ON sportiko_trainer.trainers FOR SELECT TO authenticated 
USING (id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()));

-- Trainers can update their own profile
CREATE POLICY "trainer_own_profile_update" 
ON sportiko_trainer.trainers FOR UPDATE TO authenticated 
USING (id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid())) 
WITH CHECK (id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()));

-- Allow trainer registration (insert)
CREATE POLICY "trainer_registration" 
ON sportiko_trainer.trainers FOR INSERT TO authenticated 
WITH CHECK (id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()));

--===================================================================
-- SUPERADMINS TABLE POLICIES
--===================================================================

-- Superadmins table access (no recursion)
CREATE POLICY "superadmin_table_access" 
ON sportiko_trainer.superadmins FOR ALL TO authenticated 
USING (
  auth.uid() = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'superadmin_pt@sportiko.eu'
  ) OR
  id = auth.uid()
) 
WITH CHECK (
  auth.uid() = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'superadmin_pt@sportiko.eu'
  )
);

--===================================================================
-- SUBSCRIPTION PLANS TABLE POLICIES
--===================================================================

-- Anyone can view active subscription plans
CREATE POLICY "public_view_active_subscription_plans" 
ON sportiko_trainer.subscription_plans FOR SELECT TO authenticated 
USING (is_active = true);

-- Superadmins can manage all subscription plans
CREATE POLICY "superadmin_manage_subscription_plans" 
ON sportiko_trainer.subscription_plans FOR ALL TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid())) 
WITH CHECK (sportiko_trainer.is_superadmin(auth.uid()));

--===================================================================
-- SUBSCRIPTION HISTORY TABLE POLICIES
--===================================================================

-- Trainers can view their own subscription history, superadmins can view all
CREATE POLICY "trainers_view_own_subscription_history" 
ON sportiko_trainer.subscription_history FOR SELECT TO authenticated 
USING (trainer_id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()));

-- Superadmins can manage all subscription history
CREATE POLICY "superadmin_manage_subscription_history" 
ON sportiko_trainer.subscription_history FOR ALL TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid())) 
WITH CHECK (sportiko_trainer.is_superadmin(auth.uid()));

--===================================================================
-- SHOP ITEMS TABLE POLICIES
--===================================================================

-- Anyone can view active shop items
CREATE POLICY "public_view_active_shop_items" 
ON sportiko_trainer.shop_items FOR SELECT TO authenticated 
USING (active = true);

-- Superadmins can manage all shop items
CREATE POLICY "superadmin_manage_shop_items" 
ON sportiko_trainer.shop_items FOR ALL TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid())) 
WITH CHECK (sportiko_trainer.is_superadmin(auth.uid()));

--===================================================================
-- ADS TABLE POLICIES
--===================================================================

-- Users can view relevant active ads
CREATE POLICY "users_view_active_ads" 
ON sportiko_trainer.ads FOR SELECT TO authenticated 
USING (
  active = true 
  AND CURRENT_DATE BETWEEN start_date AND end_date
  AND (
    type = 'trainer' OR 
    (type = 'superadmin' AND sportiko_trainer.is_superadmin(auth.uid()))
  )
);

-- Superadmins can manage all ads
CREATE POLICY "superadmin_manage_ads" 
ON sportiko_trainer.ads FOR ALL TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid())) 
WITH CHECK (sportiko_trainer.is_superadmin(auth.uid()));

--===================================================================
-- ORDERS TABLE POLICIES
--===================================================================

-- Users can view their own orders
CREATE POLICY "users_view_own_orders" 
ON sportiko_trainer.orders FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()));

-- Users can create their own orders
CREATE POLICY "users_create_own_orders" 
ON sportiko_trainer.orders FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()));

-- Users can update their own orders
CREATE POLICY "users_update_own_orders" 
ON sportiko_trainer.orders FOR UPDATE TO authenticated 
USING (user_id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid())) 
WITH CHECK (user_id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()));

-- Superadmins can delete orders
CREATE POLICY "superadmin_delete_orders" 
ON sportiko_trainer.orders FOR DELETE TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid()));

--===================================================================
-- ORDER ITEMS TABLE POLICIES
--===================================================================

-- Users can view their own order items
CREATE POLICY "users_view_own_order_items" 
ON sportiko_trainer.order_items FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM sportiko_trainer.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()))
  )
);

-- Users can create their own order items
CREATE POLICY "users_create_own_order_items" 
ON sportiko_trainer.order_items FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sportiko_trainer.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()))
  )
);

--===================================================================
-- TENANT SCHEMA CREATION FUNCTION
--===================================================================

-- Function to create tenant schema with proper policies (using st_ prefix)
CREATE OR REPLACE FUNCTION sportiko_trainer.create_basic_tenant_schema(trainer_id UUID)
RETURNS VOID AS $$
DECLARE
  schema_name TEXT := 'st_' || replace(trainer_id::text, '-', '_');
BEGIN
  -- Only allow superadmins to create schemas
  IF NOT sportiko_trainer.is_superadmin() THEN
    RAISE EXCEPTION 'Only superadmins can create tenant schemas';
  END IF;

  -- Create schema with sportiko_trainer prefix to avoid conflicts
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
      player_id UUID REFERENCES %I.players(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      due_date TIMESTAMP WITH TIME ZONE,
      completed BOOLEAN DEFAULT false,
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

  -- Insert sample data
  EXECUTE format('
    INSERT INTO %I.players (name, position, contact, birth_date) VALUES
    (''John Doe'', ''Forward'', ''john@example.com'', ''2000-01-01''),
    (''Sarah Smith'', ''Midfielder'', ''sarah@example.com'', ''2001-03-15''),
    (''Mike Johnson'', ''Defender'', ''mike@example.com'', ''1999-11-10'')
    ON CONFLICT DO NOTHING
  ', schema_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--===================================================================
-- SUBSCRIPTION MANAGEMENT FUNCTIONS
--===================================================================

-- Function to safely update trainer subscription plan
CREATE OR REPLACE FUNCTION sportiko_trainer.update_trainer_subscription(
  trainer_id UUID,
  new_plan TEXT,
  new_status TEXT DEFAULT 'active'
) RETURNS BOOLEAN AS $$
DECLARE
  trainer_record RECORD;
  plan_record RECORD;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();

  -- Check permissions: superadmin or the trainer themselves
  IF NOT (sportiko_trainer.is_superadmin(current_user_id) OR current_user_id = trainer_id) THEN
    RAISE EXCEPTION 'Access denied: Only superadmins or the trainer themselves can update subscriptions';
  END IF;

  -- Get current trainer data
  SELECT * INTO trainer_record FROM sportiko_trainer.trainers WHERE id = trainer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trainer not found';
  END IF;

  -- Get plan details
  SELECT * INTO plan_record FROM sportiko_trainer.subscription_plans 
  WHERE LOWER(name) = LOWER(new_plan) AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription plan "%" not found or inactive', new_plan;
  END IF;

  -- Update trainer subscription
  UPDATE sportiko_trainer.trainers SET
    subscription_plan = plan_record.name,
    subscription_status = new_status,
    subscription_start = CASE WHEN new_status = 'active' THEN NOW() ELSE subscription_start END,
    subscription_end = CASE WHEN new_status = 'active' THEN
      CASE WHEN plan_record.billing_period = 'yearly' THEN NOW() + INTERVAL '1 year'
           ELSE NOW() + INTERVAL '1 month' END
      ELSE subscription_end END,
    billing_cycle = plan_record.billing_period,
    updated_at = NOW()
  WHERE id = trainer_id;

  -- Log the action in subscription history
  INSERT INTO sportiko_trainer.subscription_history (
    trainer_id, action, old_plan, new_plan, old_status, new_status, performed_by
  ) VALUES (
    trainer_id, 'plan_changed', trainer_record.subscription_plan, plan_record.name,
    trainer_record.subscription_status, new_status, current_user_id
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--===================================================================
-- INSERT DEFAULT DATA
--===================================================================

-- Insert default subscription plans
INSERT INTO sportiko_trainer.subscription_plans (name, description, price, billing_period, features, is_active) VALUES
('Basic', 'Essential features for individual trainers', 9.99, 'monthly', '{"players_limit": 20, "storage_limit": "1GB", "advanced_analytics": false, "team_features": false}', true),
('Pro', 'Advanced features for professional trainers', 19.99, 'monthly', '{"players_limit": 50, "storage_limit": "5GB", "advanced_analytics": true, "team_features": false}', true),
('Team', 'Complete solution for training teams', 49.99, 'monthly', '{"players_limit": 100, "storage_limit": "20GB", "advanced_analytics": true, "team_features": true}', true)
ON CONFLICT (name) DO NOTHING;

-- Ensure the superadmin record exists
INSERT INTO sportiko_trainer.superadmins (id, email, full_name, created_at) VALUES
('be9c6165-808a-4335-b90e-22f6d20328bf', 'superadmin_pt@sportiko.eu', 'Super Admin', NOW())
ON CONFLICT (id) DO UPDATE SET
email = EXCLUDED.email,
full_name = EXCLUDED.full_name,
updated_at = NOW();

-- Insert sample shop items
INSERT INTO sportiko_trainer.shop_items (name, description, price, category, stock_quantity, image_url, active) VALUES
('Professional Soccer Ball', 'FIFA approved soccer ball for professional training', 29.99, 'equipment', 50, 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=400', true),
('Training Cones Set', 'Set of 20 orange training cones', 19.99, 'equipment', 30, 'https://images.unsplash.com/photo-1535131749006-b7d58b247b81?w=400', true),
('Performance Cleats', 'High-performance soccer cleats for all terrains', 89.99, 'apparel', 15, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', true)
ON CONFLICT DO NOTHING;

-- Insert sample ads
INSERT INTO sportiko_trainer.ads (title, description, image_url, link, type, start_date, end_date, active) VALUES
('Premium Subscription Available', 'Upgrade to premium for advanced analytics and unlimited players', 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=400', 'https://sportiko.eu/premium', 'superadmin', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '30 days', true),
('Summer Training Camp 2024', 'Join our intensive summer training program', 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400', 'https://sportiko.eu/camp', 'trainer', CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days', true)
ON CONFLICT DO NOTHING;

--===================================================================
-- GRANT PERMISSIONS
--===================================================================

GRANT EXECUTE ON FUNCTION sportiko_trainer.is_superadmin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sportiko_trainer.is_trainer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sportiko_trainer.create_basic_tenant_schema(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sportiko_trainer.update_trainer_subscription(UUID, TEXT, TEXT) TO authenticated;

-- Grant usage on schema
GRANT USAGE ON SCHEMA sportiko_trainer TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA sportiko_trainer TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA sportiko_trainer TO authenticated;

--===================================================================
-- END OF MASTER RLS POLICIES FILE
--===================================================================