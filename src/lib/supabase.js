import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to get tenant schema name
export const getTenantSchema = (trainerId) => {
  return `trainer_${trainerId.replace(/-/g, '_')}`;
};

// Helper function to get tenant bucket name
export const getTenantBucket = (trainerId) => {
  return `trainer-${trainerId}`;
};

// Auth helpers
export const signUp = async (email, password, metadata = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });
  return { data, error };
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Tenant management
export const createTenantSchema = async (trainerId) => {
  const schema = getTenantSchema(trainerId);
  
  const { data, error } = await supabase.rpc('create_tenant_schema', {
    schema_name: schema,
    trainer_id: trainerId
  });
  
  return { data, error };
};

export const createTenantBucket = async (trainerId) => {
  const bucketName = getTenantBucket(trainerId);
  
  const { data, error } = await supabase.storage.createBucket(bucketName, {
    public: false,
    allowedMimeTypes: ['image/*', 'video/*', 'application/pdf']
  });
  
  return { data, error };
};