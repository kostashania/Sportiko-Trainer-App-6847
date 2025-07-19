-- Create tables for the Sportiko Trainer application

-- ===============================
-- Public Schema Tables
-- ===============================

-- Trainers table
CREATE TABLE IF NOT EXISTS public.trainers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  trial_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  trial_end TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Superadmins table
CREATE TABLE IF NOT EXISTS public.superadmins (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shop items table
CREATE TABLE IF NOT EXISTS public.shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category TEXT,
  stock_quantity INTEGER DEFAULT 0,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ads table
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link TEXT,
  type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  active BOOLEAN DEFAULT true
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  total_amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id),
  shop_item_id UUID REFERENCES public.shop_items(id),
  quantity INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL
);

-- ===============================
-- RLS Policies for Public Schema
-- ===============================

-- Enable RLS on all tables
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.superadmins 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trainers policies
CREATE POLICY "Trainers can view their own profile" 
  ON public.trainers FOR SELECT 
  USING (id = auth.uid());

CREATE POLICY "Trainers can update their own profile" 
  ON public.trainers FOR UPDATE 
  USING (id = auth.uid()) 
  WITH CHECK (id = auth.uid());

CREATE POLICY "Superadmins can do everything with trainers" 
  ON public.trainers FOR ALL 
  USING (is_superadmin()) 
  WITH CHECK (is_superadmin());

-- Superadmins policies
CREATE POLICY "Only superadmins can access superadmins" 
  ON public.superadmins FOR ALL 
  USING (is_superadmin()) 
  WITH CHECK (is_superadmin());

-- Shop items policies
CREATE POLICY "Anyone can view active shop items" 
  ON public.shop_items FOR SELECT 
  USING (active = true);

CREATE POLICY "Superadmins can manage shop items" 
  ON public.shop_items FOR ALL 
  USING (is_superadmin()) 
  WITH CHECK (is_superadmin());

-- Ads policies
CREATE POLICY "Anyone can view active ads" 
  ON public.ads FOR SELECT 
  USING (active = true AND CURRENT_DATE BETWEEN start_date AND end_date);

CREATE POLICY "Superadmins can manage ads" 
  ON public.ads FOR ALL 
  USING (is_superadmin()) 
  WITH CHECK (is_superadmin());

-- Orders policies
CREATE POLICY "Users can view their own orders" 
  ON public.orders FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own orders" 
  ON public.orders FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Superadmins can manage all orders" 
  ON public.orders FOR ALL 
  USING (is_superadmin()) 
  WITH CHECK (is_superadmin());

-- Order items policies
CREATE POLICY "Users can view their own order items" 
  ON public.order_items FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own order items" 
  ON public.order_items FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Superadmins can manage all order items" 
  ON public.order_items FOR ALL 
  USING (is_superadmin()) 
  WITH CHECK (is_superadmin());

-- ===============================
-- Functions for Tenant Schema Creation
-- ===============================

-- Function to create tenant schema for a trainer
CREATE OR REPLACE FUNCTION public.create_tenant_schema(trainer_id UUID)
RETURNS VOID AS $$
DECLARE
  schema_name TEXT := 'pt_' || replace(trainer_id::text, '-', '_');
BEGIN
  -- Create schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
  
  -- Players table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.players (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      birth_date DATE,
      position TEXT,
      contact TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name);
  
  -- Enable RLS
  EXECUTE format('ALTER TABLE %I.players ENABLE ROW LEVEL SECURITY', schema_name);
  
  -- Create RLS policy
  EXECUTE format('
    CREATE POLICY "trainer_all_access" ON %I.players
      FOR ALL TO authenticated
      USING (auth.uid() = %L)
      WITH CHECK (auth.uid() = %L)
  ', schema_name, trainer_id, trainer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute SQL (for superadmins only)
CREATE OR REPLACE FUNCTION public.execute_sql(sql text)
RETURNS VOID AS $$
BEGIN
  IF is_superadmin() THEN
    EXECUTE sql;
  ELSE
    RAISE EXCEPTION 'Permission denied';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample data
INSERT INTO public.shop_items (name, description, price, category, stock_quantity, image_url, active)
VALUES
  ('Soccer Ball', 'Professional quality soccer ball', 29.99, 'equipment', 50, 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c', true),
  ('Training Cones (Set of 10)', 'Plastic training cones for drills', 19.99, 'equipment', 30, 'https://images.unsplash.com/photo-1535131749006-b7d58b247b81', true),
  ('Performance Cleats', 'High-performance soccer cleats', 89.99, 'apparel', 15, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.ads (title, description, image_url, link, type, start_date, end_date, active)
VALUES
  ('Premium Subscription', 'Upgrade to premium for advanced features', 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12', 'https://sportiko.eu/premium', 'superadmin', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', true),
  ('Summer Training Camp', 'Join our summer training program', 'https://images.unsplash.com/photo-1517466787929-bc90951d0974', 'https://sportiko.eu/camp', 'trainer', CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days', true)
ON CONFLICT DO NOTHING;