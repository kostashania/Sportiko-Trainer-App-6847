-- SPORTIKO SaaS Platform Schema Update

-- Create main sportiko_pt schema
CREATE SCHEMA IF NOT EXISTS sportiko_pt;

-- =====================
-- MAIN SCHEMA TABLES
-- =====================

-- Subscription Plans
CREATE TABLE IF NOT EXISTS sportiko_pt.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  features JSONB,
  price NUMERIC(10,2) NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trainers
CREATE TABLE IF NOT EXISTS sportiko_pt.trainers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  bio TEXT,
  profile_image_url TEXT,
  role TEXT DEFAULT 'trainer',
  subscription_plan_id UUID REFERENCES sportiko_pt.subscription_plans(id),
  subscription_status TEXT DEFAULT 'trial',
  trial_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  trial_end TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Players Authentication
CREATE TABLE IF NOT EXISTS sportiko_pt.players_auth (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  trainer_id UUID NOT NULL REFERENCES sportiko_pt.trainers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Settings
CREATE TABLE IF NOT EXISTS sportiko_pt.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Advertisements
CREATE TABLE IF NOT EXISTS sportiko_pt.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  target_url TEXT,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('global', 'trainer', 'player')),
  trainer_id UUID REFERENCES sportiko_pt.trainers(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- HELPER FUNCTIONS
-- =====================

-- Function to check if user is a trainer
CREATE OR REPLACE FUNCTION sportiko_pt.is_trainer(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sportiko_pt.trainers
    WHERE id = user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is a player
CREATE OR REPLACE FUNCTION sportiko_pt.is_player(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sportiko_pt.players_auth
    WHERE id = user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trainer ID for a player
CREATE OR REPLACE FUNCTION sportiko_pt.get_trainer_for_player(player_id UUID)
RETURNS UUID AS $$
DECLARE
  trainer_id UUID;
BEGIN
  SELECT pa.trainer_id INTO trainer_id
  FROM sportiko_pt.players_auth pa
  WHERE pa.id = player_id;
  
  RETURN trainer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- PER-TRAINER SCHEMA CREATION
-- =====================

-- Function to create per-trainer schema
CREATE OR REPLACE FUNCTION sportiko_pt.create_trainer_schema(trainer_id UUID)
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
      auth_id UUID REFERENCES sportiko_pt.players_auth(id),
      name TEXT NOT NULL,
      birthdate DATE,
      gender TEXT,
      contact_info JSONB,
      goals TEXT,
      notes TEXT,
      profile_image_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name);
  
  -- Assessments table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID REFERENCES %I.players(id) ON DELETE CASCADE,
      assessment_type TEXT NOT NULL,
      assessment_date DATE NOT NULL,
      metrics JSONB NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name);
  
  -- Exercises table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.exercises (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      difficulty TEXT,
      video_url TEXT,
      image_url TEXT,
      instructions JSONB,
      is_public BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name);
  
  -- Homework table
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
  
  -- Homework items table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.homework_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      homework_id UUID REFERENCES %I.homework(id) ON DELETE CASCADE,
      exercise_id UUID REFERENCES %I.exercises(id),
      sets INTEGER,
      reps INTEGER,
      duration INTERVAL,
      notes TEXT,
      completed BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name, schema_name);
  
  -- Products table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC(10,2) NOT NULL,
      stock_quantity INTEGER DEFAULT 0,
      category TEXT,
      image_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name);
  
  -- Orders table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID REFERENCES %I.players(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
      total_amount NUMERIC(10,2) NOT NULL,
      payment_method TEXT,
      payment_status TEXT DEFAULT 'unpaid',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name);
  
  -- Order items table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES %I.orders(id) ON DELETE CASCADE,
      product_id UUID REFERENCES %I.products(id),
      quantity INTEGER NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name, schema_name);
  
  -- Enable RLS for all tables
  EXECUTE format('ALTER TABLE %I.players ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.assessments ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.exercises ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.homework ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.homework_items ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.products ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.orders ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.order_items ENABLE ROW LEVEL SECURITY', schema_name);
  
  -- Create RLS policies for trainer access
  -- Players table
  EXECUTE format('
    CREATE POLICY trainer_all_access ON %I.players
    FOR ALL TO authenticated
    USING (auth.uid() = %L)
    WITH CHECK (auth.uid() = %L)
  ', schema_name, trainer_id, trainer_id);
  
  -- Assessments table
  EXECUTE format('
    CREATE POLICY trainer_all_access ON %I.assessments
    FOR ALL TO authenticated
    USING (auth.uid() = %L)
    WITH CHECK (auth.uid() = %L)
  ', schema_name, trainer_id, trainer_id);
  
  -- Exercises table
  EXECUTE format('
    CREATE POLICY trainer_all_access ON %I.exercises
    FOR ALL TO authenticated
    USING (auth.uid() = %L)
    WITH CHECK (auth.uid() = %L)
  ', schema_name, trainer_id, trainer_id);
  
  -- Homework table
  EXECUTE format('
    CREATE POLICY trainer_all_access ON %I.homework
    FOR ALL TO authenticated
    USING (auth.uid() = %L)
    WITH CHECK (auth.uid() = %L)
  ', schema_name, trainer_id, trainer_id);
  
  -- Homework items table
  EXECUTE format('
    CREATE POLICY trainer_all_access ON %I.homework_items
    FOR ALL TO authenticated
    USING (auth.uid() = %L)
    WITH CHECK (auth.uid() = %L)
  ', schema_name, trainer_id, trainer_id);
  
  -- Products table
  EXECUTE format('
    CREATE POLICY trainer_all_access ON %I.products
    FOR ALL TO authenticated
    USING (auth.uid() = %L)
    WITH CHECK (auth.uid() = %L)
  ', schema_name, trainer_id, trainer_id);
  
  -- Orders table
  EXECUTE format('
    CREATE POLICY trainer_all_access ON %I.orders
    FOR ALL TO authenticated
    USING (auth.uid() = %L)
    WITH CHECK (auth.uid() = %L)
  ', schema_name, trainer_id, trainer_id);
  
  -- Order items table
  EXECUTE format('
    CREATE POLICY trainer_all_access ON %I.order_items
    FOR ALL TO authenticated
    USING (auth.uid() = %L)
    WITH CHECK (auth.uid() = %L)
  ', schema_name, trainer_id, trainer_id);
  
  -- Create RLS policies for player access
  -- Players can view their own profile
  EXECUTE format('
    CREATE POLICY player_view_own ON %I.players
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM sportiko_pt.players_auth pa
        WHERE pa.id = auth.uid()
        AND pa.trainer_id = %L
        AND %I.players.auth_id = auth.uid()
      )
    )
  ', schema_name, trainer_id, schema_name);
  
  -- Players can view their own assessments
  EXECUTE format('
    CREATE POLICY player_view_own_assessments ON %I.assessments
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM sportiko_pt.players_auth pa
        JOIN %I.players p ON p.auth_id = pa.id
        WHERE pa.id = auth.uid()
        AND pa.trainer_id = %L
        AND %I.assessments.player_id = p.id
      )
    )
  ', schema_name, schema_name, trainer_id, schema_name);
  
  -- Players can view exercises
  EXECUTE format('
    CREATE POLICY player_view_exercises ON %I.exercises
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM sportiko_pt.players_auth pa
        WHERE pa.id = auth.uid()
        AND pa.trainer_id = %L
      )
    )
  ', schema_name, trainer_id);
  
  -- Players can view their own homework
  EXECUTE format('
    CREATE POLICY player_view_own_homework ON %I.homework
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM sportiko_pt.players_auth pa
        JOIN %I.players p ON p.auth_id = pa.id
        WHERE pa.id = auth.uid()
        AND pa.trainer_id = %L
        AND %I.homework.player_id = p.id
      )
    )
  ', schema_name, schema_name, trainer_id, schema_name);
  
  -- Players can update their own homework (to mark as completed)
  EXECUTE format('
    CREATE POLICY player_update_own_homework ON %I.homework
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM sportiko_pt.players_auth pa
        JOIN %I.players p ON p.auth_id = pa.id
        WHERE pa.id = auth.uid()
        AND pa.trainer_id = %L
        AND %I.homework.player_id = p.id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM sportiko_pt.players_auth pa
        JOIN %I.players p ON p.auth_id = pa.id
        WHERE pa.id = auth.uid()
        AND pa.trainer_id = %L
        AND %I.homework.player_id = p.id
      )
    )
  ', schema_name, schema_name, trainer_id, schema_name, schema_name, trainer_id, schema_name);
  
  -- Players can view their homework items
  EXECUTE format('
    CREATE POLICY player_view_own_homework_items ON %I.homework_items
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM sportiko_pt.players_auth pa
        JOIN %I.players p ON p.auth_id = pa.id
        JOIN %I.homework h ON h.player_id = p.id
        WHERE pa.id = auth.uid()
        AND pa.trainer_id = %L
        AND %I.homework_items.homework_id = h.id
      )
    )
  ', schema_name, schema_name, schema_name, trainer_id, schema_name);
  
  -- Players can view products
  EXECUTE format('
    CREATE POLICY player_view_products ON %I.products
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM sportiko_pt.players_auth pa
        WHERE pa.id = auth.uid()
        AND pa.trainer_id = %L
      )
      AND %I.products.is_active = true
    )
  ', schema_name, trainer_id, schema_name);
  
  -- Players can view and create their own orders
  EXECUTE format('
    CREATE POLICY player_view_own_orders ON %I.orders
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM sportiko_pt.players_auth pa
        JOIN %I.players p ON p.auth_id = pa.id
        WHERE pa.id = auth.uid()
        AND pa.trainer_id = %L
        AND %I.orders.player_id = p.id
      )
    )
  ', schema_name, schema_name, trainer_id, schema_name);
  
  EXECUTE format('
    CREATE POLICY player_create_own_orders ON %I.orders
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM sportiko_pt.players_auth pa
        JOIN %I.players p ON p.auth_id = pa.id
        WHERE pa.id = auth.uid()
        AND pa.trainer_id = %L
        AND %I.orders.player_id = p.id
      )
    )
  ', schema_name, schema_name, trainer_id, schema_name);
  
  -- Players can view and create their own order items
  EXECUTE format('
    CREATE POLICY player_view_own_order_items ON %I.order_items
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM sportiko_pt.players_auth pa
        JOIN %I.players p ON p.auth_id = pa.id
        JOIN %I.orders o ON o.player_id = p.id
        WHERE pa.id = auth.uid()
        AND pa.trainer_id = %L
        AND %I.order_items.order_id = o.id
      )
    )
  ', schema_name, schema_name, schema_name, trainer_id, schema_name);
  
  EXECUTE format('
    CREATE POLICY player_create_own_order_items ON %I.order_items
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM sportiko_pt.players_auth pa
        JOIN %I.players p ON p.auth_id = pa.id
        JOIN %I.orders o ON o.player_id = p.id
        WHERE pa.id = auth.uid()
        AND pa.trainer_id = %L
        AND %I.order_items.order_id = o.id
      )
    )
  ', schema_name, schema_name, schema_name, trainer_id, schema_name);
  
  -- Grant usage on schema to authenticated users
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', schema_name);
  EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated', schema_name);
  EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO authenticated', schema_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- ENABLE RLS ON MAIN SCHEMA TABLES
-- =====================

ALTER TABLE sportiko_pt.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_pt.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_pt.players_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_pt.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_pt.ads ENABLE ROW LEVEL SECURITY;

-- =====================
-- RLS POLICIES FOR MAIN SCHEMA TABLES
-- =====================

-- Subscription plans policies
CREATE POLICY "Anyone can view active subscription plans" 
ON sportiko_pt.subscription_plans 
FOR SELECT TO authenticated 
USING (is_active = true);

CREATE POLICY "Admin can manage subscription plans" 
ON sportiko_pt.subscription_plans 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin') 
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Trainer policies
CREATE POLICY "Trainers can view and update their own profile" 
ON sportiko_pt.trainers 
FOR ALL TO authenticated 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());

CREATE POLICY "Admin can manage all trainers" 
ON sportiko_pt.trainers 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin') 
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Players auth policies
CREATE POLICY "Trainers can manage their own players" 
ON sportiko_pt.players_auth 
FOR ALL TO authenticated 
USING (trainer_id = auth.uid()) 
WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Players can view their own auth" 
ON sportiko_pt.players_auth 
FOR SELECT TO authenticated 
USING (id = auth.uid());

CREATE POLICY "Admin can manage all players" 
ON sportiko_pt.players_auth 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin') 
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Settings policies
CREATE POLICY "Anyone can view public settings" 
ON sportiko_pt.settings 
FOR SELECT TO authenticated 
USING (is_public = true);

CREATE POLICY "Admin can manage all settings" 
ON sportiko_pt.settings 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin') 
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Ads policies
CREATE POLICY "Users can view relevant active ads" 
ON sportiko_pt.ads 
FOR SELECT TO authenticated 
USING (
  is_active = true 
  AND CURRENT_DATE BETWEEN start_date AND end_date 
  AND (
    ad_type = 'global' 
    OR (ad_type = 'trainer' AND (sportiko_pt.is_trainer(auth.uid()) OR trainer_id = auth.uid())) 
    OR (ad_type = 'player' AND sportiko_pt.is_player(auth.uid()))
  )
);

CREATE POLICY "Trainers can manage their own ads" 
ON sportiko_pt.ads 
FOR ALL TO authenticated 
USING (trainer_id = auth.uid()) 
WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Admin can manage all ads" 
ON sportiko_pt.ads 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin') 
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- =====================
-- TRIGGER FUNCTIONS
-- =====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION sportiko_pt.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create trainer schema after trainer creation
CREATE OR REPLACE FUNCTION sportiko_pt.create_trainer_schema_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM sportiko_pt.create_trainer_schema(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- TRIGGERS
-- =====================

-- Update timestamp triggers
CREATE TRIGGER update_subscription_plans_timestamp
BEFORE UPDATE ON sportiko_pt.subscription_plans
FOR EACH ROW EXECUTE FUNCTION sportiko_pt.update_timestamp();

CREATE TRIGGER update_trainers_timestamp
BEFORE UPDATE ON sportiko_pt.trainers
FOR EACH ROW EXECUTE FUNCTION sportiko_pt.update_timestamp();

CREATE TRIGGER update_players_auth_timestamp
BEFORE UPDATE ON sportiko_pt.players_auth
FOR EACH ROW EXECUTE FUNCTION sportiko_pt.update_timestamp();

CREATE TRIGGER update_settings_timestamp
BEFORE UPDATE ON sportiko_pt.settings
FOR EACH ROW EXECUTE FUNCTION sportiko_pt.update_timestamp();

CREATE TRIGGER update_ads_timestamp
BEFORE UPDATE ON sportiko_pt.ads
FOR EACH ROW EXECUTE FUNCTION sportiko_pt.update_timestamp();

-- Create trainer schema trigger
CREATE TRIGGER create_trainer_schema_after_insert
AFTER INSERT ON sportiko_pt.trainers
FOR EACH ROW EXECUTE FUNCTION sportiko_pt.create_trainer_schema_trigger();

-- =====================
-- UTILITY FUNCTIONS FOR DATABASE INFO
-- =====================

-- Function to get schema information
CREATE OR REPLACE FUNCTION sportiko_pt.get_schemas_info()
RETURNS TABLE(schema_name TEXT, table_count INTEGER, is_trainer_schema BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.nspname::TEXT as schema_name,
    COUNT(DISTINCT c.relname)::INTEGER as table_count,
    n.nspname LIKE 'pt_%' as is_trainer_schema
  FROM pg_namespace n
  LEFT JOIN pg_class c ON n.oid = c.relnamespace AND c.relkind = 'r'
  WHERE n.nspname NOT LIKE 'pg_%'
    AND n.nspname NOT IN ('information_schema', 'public')
  GROUP BY n.nspname
  ORDER BY n.nspname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tables information for a schema
CREATE OR REPLACE FUNCTION sportiko_pt.get_tables_info(schema_name TEXT)
RETURNS TABLE(table_name TEXT, row_count BIGINT, has_rls BOOLEAN) AS $$
DECLARE
  rec RECORD;
  row_count BIGINT;
  has_rls BOOLEAN;
BEGIN
  FOR rec IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = schema_name
      AND c.relkind = 'r'
    ORDER BY c.relname
  LOOP
    EXECUTE format('SELECT count(*) FROM %I.%I', schema_name, rec.table_name) INTO row_count;
    
    EXECUTE format('
      SELECT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = %L AND c.relname = %L AND c.relrowsecurity
      )', schema_name, rec.table_name) INTO has_rls;
    
    table_name := rec.table_name;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get policies information for a schema
CREATE OR REPLACE FUNCTION sportiko_pt.get_policies_info(schema_name TEXT)
RETURNS TABLE(tablename TEXT, policyname TEXT, cmd TEXT, roles TEXT[]) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg_policies.tablename::TEXT,
    pg_policies.policyname::TEXT,
    pg_policies.cmd::TEXT,
    pg_policies.roles::TEXT[]
  FROM pg_policies
  WHERE pg_policies.schemaname = schema_name
  ORDER BY pg_policies.tablename, pg_policies.policyname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- INITIAL DATA
-- =====================

-- Insert default subscription plans
INSERT INTO sportiko_pt.subscription_plans (name, description, features, price, billing_period)
VALUES 
  ('Basic', 'Essential features for individual trainers', '{"players_limit": 20, "storage_limit": "1GB"}', 9.99, 'monthly'),
  ('Pro', 'Advanced features for professional trainers', '{"players_limit": 50, "storage_limit": "5GB", "advanced_analytics": true}', 19.99, 'monthly'),
  ('Team', 'Complete solution for training teams', '{"players_limit": 100, "storage_limit": "20GB", "advanced_analytics": true, "team_features": true}', 49.99, 'monthly')
ON CONFLICT DO NOTHING;

-- Insert default settings
INSERT INTO sportiko_pt.settings (key, value, description, is_public)
VALUES 
  ('platform_name', '"SPORTIKO"', 'Platform name displayed in UI', true),
  ('contact_email', '"support@sportiko.com"', 'Support contact email', true),
  ('trial_duration_days', '14', 'Trial period duration in days', true),
  ('max_file_size_mb', '10', 'Maximum file size for uploads in MB', true)
ON CONFLICT DO NOTHING;