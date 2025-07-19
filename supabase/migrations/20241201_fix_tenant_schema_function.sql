-- Fix tenant schema creation and superadmin permissions

-- First, ensure we have the is_superadmin function that works with JWT
CREATE OR REPLACE FUNCTION public.is_superadmin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists in superadmins table
  RETURN EXISTS (
    SELECT 1 FROM public.superadmins 
    WHERE id = COALESCE(user_id, auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simplified tenant schema creation function
CREATE OR REPLACE FUNCTION public.create_basic_tenant_schema(trainer_id UUID)
RETURNS VOID AS $$
DECLARE
  schema_name TEXT := 'pt_' || replace(trainer_id::text, '-', '_');
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

-- Update the existing create_tenant_schema function
CREATE OR REPLACE FUNCTION public.create_tenant_schema(trainer_id UUID)
RETURNS VOID AS $$
DECLARE
  schema_name TEXT := 'pt_' || replace(trainer_id::text, '-', '_');
BEGIN
  -- Only allow superadmins to create schemas
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Only superadmins can create tenant schemas';
  END IF;

  -- Call the basic schema creation first
  PERFORM public.create_basic_tenant_schema(trainer_id);

  -- Add additional tables for full schema
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID REFERENCES %I.players(id) ON DELETE CASCADE,
      assessment_date DATE NOT NULL,
      metrics JSONB,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name);

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

  -- Enable RLS on new tables
  EXECUTE format('ALTER TABLE %I.assessments ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.exercises ENABLE ROW LEVEL SECURITY', schema_name);

  -- Create policies for new tables
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

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute arbitrary SQL (for superadmins only)
CREATE OR REPLACE FUNCTION public.execute_sql(sql TEXT)
RETURNS VOID AS $$
BEGIN
  -- Only allow superadmins to execute arbitrary SQL
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Only superadmins can execute SQL';
  END IF;
  
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure proper permissions are set on all functions
GRANT EXECUTE ON FUNCTION public.create_basic_tenant_schema(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tenant_schema(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin(UUID) TO authenticated;

-- Update trainer table structure to include additional fields
ALTER TABLE public.trainers 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update superadmin table structure
ALTER TABLE public.superadmins 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_trainers_updated_at ON public.trainers;
CREATE TRIGGER update_trainers_updated_at
  BEFORE UPDATE ON public.trainers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_superadmins_updated_at ON public.superadmins;
CREATE TRIGGER update_superadmins_updated_at
  BEFORE UPDATE ON public.superadmins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();