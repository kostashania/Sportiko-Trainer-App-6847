import { createClient } from '@supabase/supabase-js';

// Use explicit values for now to ensure connection works
const supabaseUrl = 'https://bjelydvroavsqczejpgd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZWx5ZHZyb2F2c3FjemVqcGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMjE2MDcsImV4cCI6MjA2NjU5NzYwN30.f-693IO1d0TCBQRiWcSTvjCT8I7bb0t9Op_gvD5LeIE';

console.log('Supabase URL:', supabaseUrl);
console.log('Initializing Supabase client');

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