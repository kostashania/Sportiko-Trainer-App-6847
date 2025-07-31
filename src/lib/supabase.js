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
      'X-Client-Info': 'sportiko-trainer@1.0.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
});

// Enhanced connection status checker
export const checkSupabaseConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test with a simple query that doesn't require authentication
    const { data, error } = await supabase
      .from('trainers')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Supabase connection error:', error);
      return { connected: false, error: error.message };
    }
    
    console.log('✅ Supabase connection successful');
    return { connected: true, error: null };
  } catch (error) {
    console.error('❌ Supabase connection check failed:', error);
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

// Function to create a tenant schema for a trainer
export const createTenantSchema = async (trainerId) => {
  try {
    console.log('🏗️ Creating tenant schema for trainer:', trainerId);
    
    // Use the database function that should be available to authenticated users
    const { data, error } = await supabase.rpc('create_basic_tenant_schema', {
      trainer_id: trainerId
    });
    
    if (error) {
      console.error('Error calling create_basic_tenant_schema:', error);
      throw error;
    }
    
    console.log('✅ Schema created successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ Exception creating tenant schema:', error);
    return false;
  }
};

// Function to ensure tenant schema exists
export const ensureTenantSchema = async (trainerId) => {
  try {
    const schemaName = getTenantSchema(trainerId);
    console.log('🔍 Checking if tenant schema exists:', schemaName);
    
    // Check if schema exists by trying to query a table
    const { data, error } = await supabase
      .from(`${schemaName}.players`)
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      // Schema doesn't exist, create it
      console.log('📋 Schema doesn\'t exist, creating it...');
      const created = await createTenantSchema(trainerId);
      if (!created) {
        throw new Error('Failed to create tenant schema');
      }
      return true;
    } else if (error) {
      // Other error
      console.error('❌ Error checking schema:', error);
      throw error;
    }
    
    // Schema exists
    console.log('✅ Tenant schema exists');
    return true;
  } catch (error) {
    console.error('❌ Error ensuring tenant schema:', error);
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
      hasServiceRole: false, // Don't expose service role in browser
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