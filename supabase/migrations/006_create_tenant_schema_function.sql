-- ===================================================
-- MIGRATION 006: Tenant Schema Creation
-- DESCRIPTION: Function to create per-trainer schemas
-- DATE: 2024-12-30
-- ===================================================

-- ===================================================
-- TENANT SCHEMA CREATION FUNCTION
-- ===================================================
CREATE OR REPLACE FUNCTION sportiko_trainer.create_basic_tenant_schema(trainer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    schema_name TEXT := 'st_' || replace(trainer_id::text, '-', '_');
BEGIN
    -- Only superadmins can create schemas
    IF NOT sportiko_trainer.is_superadmin(auth.uid()) THEN
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
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )', schema_name, schema_name);
    
    -- Create payments table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            player_id UUID REFERENCES %I.players(id) ON DELETE CASCADE,
            amount NUMERIC(10,2) NOT NULL,
            due_date DATE,
            paid BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )', schema_name, schema_name);
    
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I.players ENABLE ROW LEVEL SECURITY', schema_name);
    EXECUTE format('ALTER TABLE %I.homework ENABLE ROW LEVEL SECURITY', schema_name);
    EXECUTE format('ALTER TABLE %I.payments ENABLE ROW LEVEL SECURITY', schema_name);
    
    -- Create policies
    EXECUTE format('
        CREATE POLICY "trainer_access" ON %I.players 
        FOR ALL TO authenticated 
        USING (auth.uid() = %L) 
        WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);
    
    EXECUTE format('
        CREATE POLICY "trainer_access" ON %I.homework 
        FOR ALL TO authenticated 
        USING (auth.uid() = %L) 
        WITH CHECK (auth.uid() = %L)
    ', schema_name, trainer_id, trainer_id);
    
    EXECUTE format('
        CREATE POLICY "trainer_access" ON %I.payments 
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
        INSERT INTO %I.players (name, position, contact, birth_date) 
        VALUES 
            (''John Doe'', ''Forward'', ''john@example.com'', ''2000-01-01''),
            (''Sarah Smith'', ''Midfielder'', ''sarah@example.com'', ''2001-03-15''),
            (''Mike Johnson'', ''Defender'', ''mike@example.com'', ''1999-11-10'')
        ON CONFLICT DO NOTHING
    ', schema_name);
    
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION sportiko_trainer.create_basic_tenant_schema(UUID) TO authenticated;