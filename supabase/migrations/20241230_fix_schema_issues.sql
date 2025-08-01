-- Fix schema issues and create missing tables
-- This migration addresses the 406 "Not Acceptable" errors

-- First, ensure we have the correct tables in the sportiko_trainer schema
-- Create the sportiko_trainer schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS sportiko_trainer;

-- Create all required tables in the sportiko_trainer schema
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

-- Enable RLS on all tables
ALTER TABLE sportiko_trainer.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.subscription_history ENABLE ROW LEVEL SECURITY;

-- Create helper functions for the sportiko_trainer schema
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

-- Create policies for all tables
-- Drop existing policies first
DROP POLICY IF EXISTS "superadmin_full_access_trainers" ON sportiko_trainer.trainers;
DROP POLICY IF EXISTS "trainer_own_profile_access" ON sportiko_trainer.trainers;
DROP POLICY IF EXISTS "trainer_own_profile_update" ON sportiko_trainer.trainers;
DROP POLICY IF EXISTS "trainer_registration" ON sportiko_trainer.trainers;

-- Trainers table policies
CREATE POLICY "superadmin_full_access_trainers" 
ON sportiko_trainer.trainers FOR ALL TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid())) 
WITH CHECK (sportiko_trainer.is_superadmin(auth.uid()));

CREATE POLICY "trainer_own_profile_access" 
ON sportiko_trainer.trainers FOR SELECT TO authenticated 
USING (id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()));

CREATE POLICY "trainer_own_profile_update" 
ON sportiko_trainer.trainers FOR UPDATE TO authenticated 
USING (id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid())) 
WITH CHECK (id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()));

CREATE POLICY "trainer_registration" 
ON sportiko_trainer.trainers FOR INSERT TO authenticated 
WITH CHECK (id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()));

-- Superadmins table policies
DROP POLICY IF EXISTS "superadmin_table_access" ON sportiko_trainer.superadmins;
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

-- Shop items policies
DROP POLICY IF EXISTS "public_view_active_shop_items" ON sportiko_trainer.shop_items;
DROP POLICY IF EXISTS "superadmin_manage_shop_items" ON sportiko_trainer.shop_items;

CREATE POLICY "public_view_active_shop_items" 
ON sportiko_trainer.shop_items FOR SELECT TO authenticated 
USING (active = true);

CREATE POLICY "superadmin_manage_shop_items" 
ON sportiko_trainer.shop_items FOR ALL TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid())) 
WITH CHECK (sportiko_trainer.is_superadmin(auth.uid()));

-- Ads policies
DROP POLICY IF EXISTS "users_view_active_ads" ON sportiko_trainer.ads;
DROP POLICY IF EXISTS "superadmin_manage_ads" ON sportiko_trainer.ads;

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

CREATE POLICY "superadmin_manage_ads" 
ON sportiko_trainer.ads FOR ALL TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid())) 
WITH CHECK (sportiko_trainer.is_superadmin(auth.uid()));

-- Orders policies
DROP POLICY IF EXISTS "users_view_own_orders" ON sportiko_trainer.orders;
DROP POLICY IF EXISTS "users_create_own_orders" ON sportiko_trainer.orders;
DROP POLICY IF EXISTS "users_update_own_orders" ON sportiko_trainer.orders;
DROP POLICY IF EXISTS "superadmin_delete_orders" ON sportiko_trainer.orders;

CREATE POLICY "users_view_own_orders" 
ON sportiko_trainer.orders FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()));

CREATE POLICY "users_create_own_orders" 
ON sportiko_trainer.orders FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()));

CREATE POLICY "users_update_own_orders" 
ON sportiko_trainer.orders FOR UPDATE TO authenticated 
USING (user_id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid())) 
WITH CHECK (user_id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()));

CREATE POLICY "superadmin_delete_orders" 
ON sportiko_trainer.orders FOR DELETE TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid()));

-- Order items policies
DROP POLICY IF EXISTS "users_view_own_order_items" ON sportiko_trainer.order_items;
DROP POLICY IF EXISTS "users_create_own_order_items" ON sportiko_trainer.order_items;

CREATE POLICY "users_view_own_order_items" 
ON sportiko_trainer.order_items FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM sportiko_trainer.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()))
  )
);

CREATE POLICY "users_create_own_order_items" 
ON sportiko_trainer.order_items FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sportiko_trainer.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()))
  )
);

-- Subscription plans policies
DROP POLICY IF EXISTS "public_view_active_subscription_plans" ON sportiko_trainer.subscription_plans;
DROP POLICY IF EXISTS "superadmin_manage_subscription_plans" ON sportiko_trainer.subscription_plans;

CREATE POLICY "public_view_active_subscription_plans" 
ON sportiko_trainer.subscription_plans FOR SELECT TO authenticated 
USING (is_active = true);

CREATE POLICY "superadmin_manage_subscription_plans" 
ON sportiko_trainer.subscription_plans FOR ALL TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid())) 
WITH CHECK (sportiko_trainer.is_superadmin(auth.uid()));

-- Subscription history policies
DROP POLICY IF EXISTS "trainers_view_own_subscription_history" ON sportiko_trainer.subscription_history;
DROP POLICY IF EXISTS "superadmin_manage_subscription_history" ON sportiko_trainer.subscription_history;

CREATE POLICY "trainers_view_own_subscription_history" 
ON sportiko_trainer.subscription_history FOR SELECT TO authenticated 
USING (trainer_id = auth.uid() OR sportiko_trainer.is_superadmin(auth.uid()));

CREATE POLICY "superadmin_manage_subscription_history" 
ON sportiko_trainer.subscription_history FOR ALL TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid())) 
WITH CHECK (sportiko_trainer.is_superadmin(auth.uid()));

-- Insert default data
-- Ensure the superadmin record exists
INSERT INTO sportiko_trainer.superadmins (id, email, full_name, created_at) VALUES
('be9c6165-808a-4335-b90e-22f6d20328bf', 'superadmin_pt@sportiko.eu', 'Super Admin', NOW())
ON CONFLICT (id) DO UPDATE SET
email = EXCLUDED.email,
full_name = EXCLUDED.full_name,
updated_at = NOW();

-- Insert default subscription plans
INSERT INTO sportiko_trainer.subscription_plans (name, description, price, billing_period, features, is_active) VALUES
('Basic', 'Essential features for individual trainers', 9.99, 'monthly', '{"players_limit": 20, "storage_limit": "1GB", "advanced_analytics": false, "team_features": false}', true),
('Pro', 'Advanced features for professional trainers', 19.99, 'monthly', '{"players_limit": 50, "storage_limit": "5GB", "advanced_analytics": true, "team_features": false}', true),
('Team', 'Complete solution for training teams', 49.99, 'monthly', '{"players_limit": 100, "storage_limit": "20GB", "advanced_analytics": true, "team_features": true}', true)
ON CONFLICT (name) DO NOTHING;

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION sportiko_trainer.is_superadmin(UUID) TO authenticated;
GRANT USAGE ON SCHEMA sportiko_trainer TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA sportiko_trainer TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA sportiko_trainer TO authenticated;

-- Create the demo trainer record
INSERT INTO sportiko_trainer.trainers (
  id, 
  email, 
  full_name, 
  trial_end, 
  is_active, 
  created_at
) VALUES (
  'd45616a4-d90b-4358-b62c-9005f61e3d84',
  'trainer_pt@sportiko.eu',
  'Demo Trainer',
  NOW() + INTERVAL '14 days',
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
email = EXCLUDED.email,
full_name = EXCLUDED.full_name,
trial_end = EXCLUDED.trial_end,
is_active = EXCLUDED.is_active,
updated_at = NOW();