-- Fix schema creation function to handle existing policies
CREATE OR REPLACE FUNCTION public.create_trainer_schema_safe(trainer_id UUID)
RETURNS VOID AS $$
DECLARE
  schema_name TEXT := 'pt_' || replace(trainer_id::text, '-', '_');
  policy_exists BOOLEAN;
BEGIN
  -- Only allow superadmins to create schemas
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Only superadmins can create tenant schemas';
  END IF;

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
      player_id UUID REFERENCES %I.players(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      due_date TIMESTAMP WITH TIME ZONE,
      completed BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name);

  -- Create assessments table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID REFERENCES %I.players(id) ON DELETE CASCADE,
      assessment_date DATE NOT NULL,
      metrics JSONB,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name);

  -- Create exercises table
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
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name);

  -- Create homework_items table
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

  -- Create products table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC(10,2) NOT NULL,
      stock_quantity INTEGER DEFAULT 0,
      image_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name);

  -- Create orders table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID REFERENCES %I.players(id) ON DELETE CASCADE,
      total_amount NUMERIC(10,2) NOT NULL,
      status TEXT DEFAULT ''pending'',
      paid BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name);

  -- Create order_items table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES %I.orders(id) ON DELETE CASCADE,
      product_id UUID REFERENCES %I.products(id),
      quantity INTEGER NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name, schema_name);

  -- Enable RLS on all tables
  EXECUTE format('ALTER TABLE %I.players ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.homework ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.assessments ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.exercises ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.homework_items ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.products ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.orders ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.order_items ENABLE ROW LEVEL SECURITY', schema_name);

  -- Check if policies exist before creating them
  -- Players table policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = schema_name 
    AND tablename = 'players' 
    AND policyname = 'trainer_all_access'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.players 
      FOR ALL TO authenticated 
      USING (auth.uid() = %L) 
      WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);
  END IF;

  -- Homework table policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = schema_name 
    AND tablename = 'homework' 
    AND policyname = 'trainer_all_access'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.homework 
      FOR ALL TO authenticated 
      USING (auth.uid() = %L) 
      WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);
  END IF;

  -- Assessments table policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = schema_name 
    AND tablename = 'assessments' 
    AND policyname = 'trainer_all_access'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.assessments 
      FOR ALL TO authenticated 
      USING (auth.uid() = %L) 
      WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);
  END IF;

  -- Exercises table policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = schema_name 
    AND tablename = 'exercises' 
    AND policyname = 'trainer_all_access'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.exercises 
      FOR ALL TO authenticated 
      USING (auth.uid() = %L) 
      WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);
  END IF;

  -- Homework_items table policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = schema_name 
    AND tablename = 'homework_items' 
    AND policyname = 'trainer_all_access'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.homework_items 
      FOR ALL TO authenticated 
      USING (auth.uid() = %L) 
      WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);
  END IF;

  -- Products table policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = schema_name 
    AND tablename = 'products' 
    AND policyname = 'trainer_all_access'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.products 
      FOR ALL TO authenticated 
      USING (auth.uid() = %L) 
      WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);
  END IF;

  -- Orders table policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = schema_name 
    AND tablename = 'orders' 
    AND policyname = 'trainer_all_access'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.orders 
      FOR ALL TO authenticated 
      USING (auth.uid() = %L) 
      WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);
  END IF;

  -- Order_items table policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = schema_name 
    AND tablename = 'order_items' 
    AND policyname = 'trainer_all_access'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.order_items 
      FOR ALL TO authenticated 
      USING (auth.uid() = %L) 
      WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);
  END IF;

  -- Grant permissions
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', schema_name);
  EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated', schema_name);
  EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO authenticated', schema_name);

  -- Insert sample data
  EXECUTE format('
    INSERT INTO %I.players (name, position, contact, birth_date) 
    VALUES 
      (''John Doe'', ''Forward'', ''john@example.com'', ''2000-01-01''),
      (''Sarah Smith'', ''Midfielder'', ''sarah@example.com'', ''2001-03-15''),
      (''Mike Johnson'', ''Defender'', ''mike@example.com'', ''1999-11-10'')
    ON CONFLICT DO NOTHING
  ', schema_name);

  -- Insert sample exercises
  EXECUTE format('
    INSERT INTO %I.exercises (name, description, category, difficulty, instructions) 
    VALUES 
      (''Push-ups'', ''Basic upper body exercise'', ''Strength'', ''Beginner'', ''{"steps": ["Start in plank position", "Lower your body", "Push back up"]}''),
      (''Squats'', ''Lower body strength exercise'', ''Strength'', ''Beginner'', ''{"steps": ["Stand with feet shoulder-width apart", "Lower your body", "Push back up"]}''),
      (''Running'', ''Cardiovascular exercise'', ''Cardio'', ''Beginner'', ''{"steps": ["Start with light jogging", "Gradually increase pace", "Maintain steady rhythm"]}'' )
    ON CONFLICT DO NOTHING
  ', schema_name);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_trainer_schema_safe(UUID) TO authenticated;

-- Update the basic function to also handle existing policies
CREATE OR REPLACE FUNCTION public.create_basic_tenant_schema(trainer_id UUID)
RETURNS VOID AS $$
DECLARE
  schema_name TEXT := 'pt_' || replace(trainer_id::text, '-', '_');
  policy_exists BOOLEAN;
BEGIN
  -- Only allow superadmins to create schemas
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Only superadmins can create tenant schemas';
  END IF;

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

  -- Check and create policies only if they don't exist
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = schema_name 
    AND tablename = 'players' 
    AND policyname = 'trainer_all_access'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.players 
      FOR ALL TO authenticated 
      USING (auth.uid() = %L) 
      WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = schema_name 
    AND tablename = 'homework' 
    AND policyname = 'trainer_all_access'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.homework 
      FOR ALL TO authenticated 
      USING (auth.uid() = %L) 
      WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = schema_name 
    AND tablename = 'payments' 
    AND policyname = 'trainer_all_access'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.payments 
      FOR ALL TO authenticated 
      USING (auth.uid() = %L) 
      WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);
  END IF;

  -- Grant permissions
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', schema_name);
  EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated', schema_name);
  EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO authenticated', schema_name);

  -- Insert sample data
  EXECUTE format('
    INSERT INTO %I.players (name, position, contact, birth_date) 
    VALUES 
      (''John Doe'', ''Forward'', ''john@example.com'', ''2000-01-01''),
      (''Sarah Smith'', ''Midfielder'', ''sarah@example.com'', ''2001-03-15''),
      (''Mike Johnson'', ''Defender'', ''mike@example.com'', ''1999-11-10'')
    ON CONFLICT DO NOTHING
  ', schema_name);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;