import { createClient } from '@supabase/supabase-js';

// Use environment variables or fallback to hardcoded values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bjelydvroavsqczejpgd.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZWx5ZHZyb2F2c3FjemVqcGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMjE2MDcsImV4cCI6MjA2NjU5NzYwN30.f-693IO1d0TCBQRiWcSTvjCT8I7bb0t9Op_gvD5LeIE';

// Create supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

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

// Demo auth helper - completely bypass Supabase for demo users
export const demoAuth = {
  // Demo users with their profiles
  users: {
    'admin@sportiko.com': {
      id: 'demo-admin-id',
      email: 'admin@sportiko.com',
      role: 'superadmin',
      full_name: 'Demo Admin',
      trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    'superadmin@sportiko.eu': {
      id: 'demo-superadmin-id',
      email: 'superadmin@sportiko.eu',
      role: 'superadmin',
      full_name: 'Super Admin',
      trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    'trainer@sportiko.com': {
      id: 'demo-trainer-id',
      email: 'trainer@sportiko.com',
      role: 'trainer',
      full_name: 'Demo Trainer',
      trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
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