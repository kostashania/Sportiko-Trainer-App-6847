import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bjelydvroavsqczejpgd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZWx5ZHZyb2F2c3FjemVqcGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMjE2MDcsImV4cCI6MjA2NjU5NzYwN30.f-693IO1d0TCBQRiWcSTvjCT8I7bb0t9Op_gvD5LeIE';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

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