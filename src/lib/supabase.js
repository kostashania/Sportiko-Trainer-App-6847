import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'sportiko_trainer'
  }
});

// Get tenant schema based on user ID
export const getTenantSchema = (userId) => {
  return `trainer_${userId.replace(/-/g, '_')}`;
};

// Update table references to use schema
export const TABLES = {
  TRAINERS: 'sportiko_trainer.trainers',
  SUPERADMINS: 'sportiko_trainer.superadmins',
  PLAYERS: 'sportiko_trainer.players',
  SHOP_ITEMS: 'sportiko_trainer.shop_items',
  ADS: 'sportiko_trainer.ads',
  ORDERS: 'sportiko_trainer.orders',
  ORDER_ITEMS: 'sportiko_trainer.order_items'
};

// Storage bucket name
export const STORAGE_BUCKET = 'sportiko_trainer';

// Helper functions
export const getStoragePath = (path) => `${STORAGE_BUCKET}/${path}`;

export const storage = {
  upload: async (file, path) => {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file);
    return { data, error };
  },
  
  getPublicUrl: (path) => {
    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);
    return data.publicUrl;
  },
  
  remove: async (path) => {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);
    return { error };
  }
};