import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bjelydvroavsqczejpgd.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZWx5ZHZyb2F2c3FjemVqcGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMjE2MDcsImV4cCI6MjA2NjU5NzYwN30.f-693IO1d0TCBQRiWcSTvjCT8I7bb0t9Op_gvD5LeIE';

// Validate required environment variables
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required Supabase environment variables');
}

// Create the main Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'sportiko-trainer@1.0.0'
    }
  }
});

// Create admin client for service operations (only use server-side or in secure contexts)
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null;

// Connection status checker
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('trainers')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return { connected: false, error: error.message };
    }
    
    return { connected: true, error: null };
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return { connected: false, error: error.message };
  }
};

// Get tenant schema based on user ID
export const getTenantSchema = (userId) => {
  return `pt_${userId.replace(/-/g, '_')}`;
};

// Schema names
export const SCHEMAS = {
  MAIN: 'sportiko_pt',
  TRAINER_PREFIX: 'pt_'
};

// Table names in main schema
export const MAIN_TABLES = {
  SUBSCRIPTION_PLANS: 'subscription_plans',
  TRAINERS: 'trainers',
  PLAYERS_AUTH: 'players_auth',
  SETTINGS: 'settings',
  ADS: 'ads'
};

// Table names in trainer schema
export const TRAINER_TABLES = {
  PLAYERS: 'players',
  ASSESSMENTS: 'assessments',
  EXERCISES: 'exercises',
  HOMEWORK: 'homework',
  HOMEWORK_ITEMS: 'homework_items',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items'
};

// Real user IDs from the database
export const REAL_USERS = {
  SUPERADMIN: 'be9c6165-808a-4335-b90e-22f6d20328bf',
  TRAINER: 'd45616a4-d90b-4358-b62c-9005f61e3d84',
  PLAYER: '131dc3dc-eccc-4c00-a2fa-8bf408b4d86c'
};

// Demo auth helper - completely bypass Supabase for demo users
export const demoAuth = {
  // Demo users with their profiles
  users: {
    'superadmin_pt@sportiko.eu': {
      id: REAL_USERS.SUPERADMIN,
      email: 'superadmin_pt@sportiko.eu',
      role: 'superadmin',
      full_name: 'Super Admin',
      trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    'trainer_pt@sportiko.eu': {
      id: REAL_USERS.TRAINER,
      email: 'trainer_pt@sportiko.eu',
      role: 'trainer',
      full_name: 'Test Trainer',
      trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    'player_pt@sportiko.eu': {
      id: REAL_USERS.PLAYER,
      email: 'player_pt@sportiko.eu',
      role: 'player',
      full_name: 'Test Player',
      trainer_id: REAL_USERS.TRAINER,
      trial_end: null
    }
  },

  // Check if email is for a demo user
  isDemoUser: (email) => {
    return !!demoAuth.users[email];
  },

  // Get demo user profile
  getDemoUser: (email) => {
    return demoAuth.users[email] || null;
  },

  // Login with demo credentials
  signIn: (email, password) => {
    // For demo purposes, any password works for demo users
    if (demoAuth.isDemoUser(email)) {
      const user = demoAuth.getDemoUser(email);
      return { data: { user }, error: null };
    }
    return { data: null, error: { message: 'Invalid credentials' } };
  }
};

// Function to create a tenant schema for a trainer
export const createTenantSchema = async (trainerId) => {
  try {
    // First check if schema exists
    const schemaName = getTenantSchema(trainerId);
    
    // Use admin client if available, otherwise regular client
    const client = supabaseAdmin || supabase;
    
    // Create the schema using RPC function
    const { error } = await client.rpc('create_tenant_schema', {
      trainer_id: trainerId
    });

    if (error) {
      console.error('Error creating tenant schema:', error);
      
      // Fallback: Try to create schema directly with SQL
      const { error: sqlError } = await client.rpc('execute_sql', {
        sql: `
          CREATE SCHEMA IF NOT EXISTS ${schemaName};
          
          -- Players table
          CREATE TABLE IF NOT EXISTS ${schemaName}.players (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            birth_date DATE,
            position TEXT,
            contact TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Assessments table
          CREATE TABLE IF NOT EXISTS ${schemaName}.assessments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            player_id UUID REFERENCES ${schemaName}.players(id) ON DELETE CASCADE,
            assessment_date DATE NOT NULL,
            metrics JSONB,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Exercises table
          CREATE TABLE IF NOT EXISTS ${schemaName}.exercises (
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
          );
          
          -- Homework table
          CREATE TABLE IF NOT EXISTS ${schemaName}.homework (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            player_id UUID REFERENCES ${schemaName}.players(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            due_date TIMESTAMP WITH TIME ZONE,
            completed BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Products table
          CREATE TABLE IF NOT EXISTS ${schemaName}.products (
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
          );
          
          -- Orders table
          CREATE TABLE IF NOT EXISTS ${schemaName}.orders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            player_id UUID REFERENCES ${schemaName}.players(id) ON DELETE CASCADE,
            status TEXT DEFAULT 'pending',
            total_amount NUMERIC(10,2) NOT NULL,
            payment_method TEXT,
            payment_status TEXT DEFAULT 'unpaid',
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Enable RLS on all tables
          ALTER TABLE ${schemaName}.players ENABLE ROW LEVEL SECURITY;
          ALTER TABLE ${schemaName}.assessments ENABLE ROW LEVEL SECURITY;
          ALTER TABLE ${schemaName}.exercises ENABLE ROW LEVEL SECURITY;
          ALTER TABLE ${schemaName}.homework ENABLE ROW LEVEL SECURITY;
          ALTER TABLE ${schemaName}.products ENABLE ROW LEVEL SECURITY;
          ALTER TABLE ${schemaName}.orders ENABLE ROW LEVEL SECURITY;
          
          -- Create RLS policies for the trainer
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
            
          CREATE POLICY "trainer_all_access" ON ${schemaName}.products
            FOR ALL TO authenticated
            USING (auth.uid() = '${trainerId}')
            WITH CHECK (auth.uid() = '${trainerId}');
            
          CREATE POLICY "trainer_all_access" ON ${schemaName}.orders
            FOR ALL TO authenticated
            USING (auth.uid() = '${trainerId}')
            WITH CHECK (auth.uid() = '${trainerId}');
          
          -- Grant usage to authenticated users
          GRANT USAGE ON SCHEMA ${schemaName} TO authenticated;
          GRANT ALL ON ALL TABLES IN SCHEMA ${schemaName} TO authenticated;
        `
      });
      
      if (sqlError) {
        console.error('Error creating tenant schema with SQL:', sqlError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Exception creating tenant schema:', error);
    return false;
  }
};

// Database configuration storage and retrieval
export const dbConfig = {
  // Store configuration in localStorage for client-side access
  store: (config) => {
    try {
      localStorage.setItem('sportiko_db_config', JSON.stringify({
        ...config,
        timestamp: Date.now()
      }));
      return true;
    } catch (error) {
      console.error('Error storing DB config:', error);
      return false;
    }
  },

  // Retrieve configuration from localStorage
  retrieve: () => {
    try {
      const stored = localStorage.getItem('sportiko_db_config');
      if (!stored) return null;
      
      const config = JSON.parse(stored);
      
      // Check if config is older than 24 hours
      if (Date.now() - config.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('sportiko_db_config');
        return null;
      }
      
      return config;
    } catch (error) {
      console.error('Error retrieving DB config:', error);
      return null;
    }
  },

  // Get current configuration
  getCurrent: () => {
    return {
      url: supabaseUrl,
      anonKey: supabaseKey,
      hasServiceRole: !!serviceRoleKey,
      timestamp: Date.now()
    };
  }
};

// Initialize connection check on module load
checkSupabaseConnection().then(result => {
  if (result.connected) {
    console.log('✅ Supabase connected successfully');
    // Store current config
    dbConfig.store(dbConfig.getCurrent());
  } else {
    console.error('❌ Supabase connection failed:', result.error);
  }
});

export default supabase;