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
  return `trainer_${userId.replace(/-/g, '_')}`;
};

// Table names
export const TABLES = {
  TRAINERS: 'trainers',
  SUPERADMINS: 'superadmins',
  PLAYERS: 'players',
  SHOP_ITEMS: 'shop_items',
  ADS: 'ads',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items'
};