// Utility for making fetch requests to Supabase with proper headers
import { supabase } from './supabase';

/**
 * Enhanced fetch wrapper for Supabase API calls
 * Automatically adds required headers for Supabase REST API
 */
export const fetchWithSupabase = async (url, init = {}) => {
  const headers = new Headers(init.headers || {});
  const supabaseKey = supabase.supabaseKey;
  const accessToken = (await supabase.auth.getSession())?.data?.session?.access_token;
  
  // Set required Supabase headers
  if (!headers.has('apikey')) {
    headers.set('apikey', supabaseKey);
  }
  
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  
  // Always set Accept header to application/json to prevent 406 errors
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  
  // Set Content-Type for write operations
  if (
    ['POST', 'PUT', 'PATCH'].includes((init?.method || 'GET').toUpperCase()) && 
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetch(url, {
    ...init,
    headers
  });
};

/**
 * Helper to check if a table exists in Supabase
 * Uses proper headers to avoid 406 errors
 */
export const checkTableExists = async (tableName, schema = 'public') => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id', { count: 'exact' })
      .limit(1);
      
    // If we get here, table exists (even if empty)
    return { exists: true, error: null };
  } catch (error) {
    // Check if error is because table doesn't exist
    if (error.code === '42P01') {
      return { exists: false, error: 'Table does not exist' };
    }
    return { exists: false, error: error.message };
  }
};