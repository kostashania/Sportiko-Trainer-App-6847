import { supabase } from '../lib/supabase';

/**
 * Creates a tenant schema for a trainer
 * @param {string} trainerId - UUID of the trainer
 * @returns {Promise<boolean>} - Success status
 */
export const createTenantSchema = async (trainerId) => {
  try {
    // Create schema name from trainer ID
    const schemaName = `pt_${trainerId.replace(/-/g, '_')}`;
    
    // Try to execute SQL directly 
    const { error } = await supabase.rpc('execute_sql', {
      sql: `
        -- Create schema
        CREATE SCHEMA IF NOT EXISTS ${schemaName};
        
        -- Players table
        CREATE TABLE IF NOT EXISTS ${schemaName}.players (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          birth_date DATE,
          position TEXT,
          contact TEXT,
          avatar_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Assessments table
        CREATE TABLE IF NOT EXISTS ${schemaName}.assessments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          player_id UUID REFERENCES ${schemaName}.players(id) ON DELETE CASCADE,
          assessment_date DATE NOT NULL,
          notes TEXT,
          metrics JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Exercises table
        CREATE TABLE IF NOT EXISTS ${schemaName}.exercises (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          image_url TEXT,
          video_url TEXT,
          tags TEXT[],
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Homework table
        CREATE TABLE IF NOT EXISTS ${schemaName}.homework (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          player_id UUID REFERENCES ${schemaName}.players(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          notes TEXT,
          due_date TIMESTAMP WITH TIME ZONE,
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Homework items table
        CREATE TABLE IF NOT EXISTS ${schemaName}.homework_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          homework_id UUID REFERENCES ${schemaName}.homework(id) ON DELETE CASCADE,
          sets INTEGER,
          reps INTEGER,
          notes TEXT,
          completed BOOLEAN DEFAULT FALSE
        );
        
        -- Products table
        CREATE TABLE IF NOT EXISTS ${schemaName}.products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          price NUMERIC(10,2) NOT NULL,
          stock_quantity INTEGER DEFAULT 0,
          image_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Orders table
        CREATE TABLE IF NOT EXISTS ${schemaName}.orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          player_id UUID REFERENCES ${schemaName}.players(id) ON DELETE CASCADE,
          total_amount NUMERIC(10,2) NOT NULL,
          paid BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Enable RLS for all tables
        ALTER TABLE ${schemaName}.players ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${schemaName}.assessments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${schemaName}.exercises ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${schemaName}.homework ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${schemaName}.homework_items ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${schemaName}.products ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${schemaName}.orders ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        -- Trainer can do everything with their own tables
        CREATE POLICY "trainer_all_access" ON ${schemaName}.players
          FOR ALL TO authenticated
          USING (auth.uid() = '${trainerId}')
          WITH CHECK (auth.uid() = '${trainerId}');
        
        CREATE POLICY "trainer_all_access" ON ${schemaName}.assessments
          FOR ALL TO authenticated
          USING (auth.uid() = '${trainerId}')
          WITH CHECK (auth.uid() = '${trainerId}');
          
        CREATE POLICY "trainer_all_access" ON ${schemaName}.exercises
          FOR ALL TO authenticated
          USING (auth.uid() = '${trainerId}')
          WITH CHECK (auth.uid() = '${trainerId}');
          
        CREATE POLICY "trainer_all_access" ON ${schemaName}.homework
          FOR ALL TO authenticated
          USING (auth.uid() = '${trainerId}')
          WITH CHECK (auth.uid() = '${trainerId}');
          
        CREATE POLICY "trainer_all_access" ON ${schemaName}.homework_items
          FOR ALL TO authenticated
          USING (auth.uid() = '${trainerId}')
          WITH CHECK (auth.uid() = '${trainerId}');
          
        CREATE POLICY "trainer_all_access" ON ${schemaName}.products
          FOR ALL TO authenticated
          USING (auth.uid() = '${trainerId}')
          WITH CHECK (auth.uid() = '${trainerId}');
          
        CREATE POLICY "trainer_all_access" ON ${schemaName}.orders
          FOR ALL TO authenticated
          USING (auth.uid() = '${trainerId}')
          WITH CHECK (auth.uid() = '${trainerId}');
      `
    });
    
    if (error) {
      console.error('Error creating tenant schema:', error);
      
      // Try a simpler approach with fewer tables
      try {
        const { error: simpleError } = await supabase.rpc('execute_sql', {
          sql: `
            -- Create schema
            CREATE SCHEMA IF NOT EXISTS ${schemaName};
            
            -- Players table only
            CREATE TABLE IF NOT EXISTS ${schemaName}.players (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              name TEXT NOT NULL,
              contact TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Enable RLS
            ALTER TABLE ${schemaName}.players ENABLE ROW LEVEL SECURITY;
            
            -- Create RLS policy
            CREATE POLICY "trainer_all_access" ON ${schemaName}.players
              FOR ALL TO authenticated
              USING (auth.uid() = '${trainerId}')
              WITH CHECK (auth.uid() = '${trainerId}');
          `
        });
        
        if (simpleError) {
          console.error('Error creating simple schema:', simpleError);
          return false;
        }
        
        return true;
      } catch (simpleError) {
        console.error('Exception creating simple schema:', simpleError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Exception in createTenantSchema:', error);
    return false;
  }
};

export default createTenantSchema;