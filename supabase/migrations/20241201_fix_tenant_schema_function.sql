-- Fix tenant schema creation function to work with RLS
-- This function should be callable by authenticated users (superadmins)

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.create_tenant_schema(UUID);
DROP FUNCTION IF EXISTS public.create_tenant_schema(TEXT, UUID);
DROP FUNCTION IF EXISTS sportiko_pt.create_trainer_schema(UUID);

-- Create a function that can be called by superadmins
CREATE OR REPLACE FUNCTION public.create_tenant_schema(trainer_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  schema_name TEXT := 'pt_' || replace(trainer_id::text, '-', '_');
  result BOOLEAN := FALSE;
BEGIN
  -- Check if the current user is a superadmin
  IF NOT EXISTS (
    SELECT 1 FROM public.superadmins 
    WHERE id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only superadmins can create tenant schemas';
  END IF;

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
        category TEXT,
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )', schema_name);

    -- Create orders table
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID REFERENCES %I.players(id) ON DELETE CASCADE,
        status TEXT DEFAULT ''pending'',
        total_amount NUMERIC(10,2) NOT NULL,
        payment_method TEXT,
        payment_status TEXT DEFAULT ''unpaid'',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.players
        FOR ALL TO authenticated
        USING (auth.uid() = %L)
        WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);

    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.assessments
        FOR ALL TO authenticated
        USING (auth.uid() = %L)
        WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);

    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.exercises
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
      CREATE POLICY "trainer_all_access" ON %I.homework_items
        FOR ALL TO authenticated
        USING (auth.uid() = %L)
        WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);

    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.products
        FOR ALL TO authenticated
        USING (auth.uid() = %L)
        WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);

    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.orders
        FOR ALL TO authenticated
        USING (auth.uid() = %L)
        WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);

    EXECUTE format('
      CREATE POLICY "trainer_all_access" ON %I.order_items
        FOR ALL TO authenticated
        USING (auth.uid() = %L)
        WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);

    -- Grant usage on schema to authenticated users
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', schema_name);
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated', schema_name);
    EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO authenticated', schema_name);

    result := TRUE;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error and return false
    RAISE WARNING 'Error creating tenant schema: %', SQLERRM;
    result := FALSE;
  END;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_tenant_schema(UUID) TO authenticated;

-- Create a simpler version that just creates the basic structure
CREATE OR REPLACE FUNCTION public.create_basic_tenant_schema(trainer_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  schema_name TEXT := 'pt_' || replace(trainer_id::text, '-', '_');
BEGIN
  -- Check if the current user is a superadmin
  IF NOT EXISTS (
    SELECT 1 FROM public.superadmins 
    WHERE id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only superadmins can create tenant schemas';
  END IF;

  -- Create schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
  
  -- Create basic players table
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

  -- Create basic policy
  EXECUTE format('
    CREATE POLICY "trainer_all_access" ON %I.players
      FOR ALL TO authenticated
      USING (auth.uid() = %L)
      WITH CHECK (auth.uid() = %L)
  ', schema_name, trainer_id, trainer_id);

  -- Grant permissions
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', schema_name);
  EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated', schema_name);

  RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_basic_tenant_schema(UUID) TO authenticated;