-- Fix RPC functions for database info

-- Create schema info function in public schema
CREATE OR REPLACE FUNCTION public.get_schemas_info()
RETURNS TABLE(
  schema_name TEXT,
  table_count INTEGER,
  is_trainer_schema BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.nspname::TEXT as schema_name,
    COUNT(DISTINCT c.relname)::INTEGER as table_count,
    n.nspname LIKE 'pt_%' as is_trainer_schema
  FROM pg_namespace n
  LEFT JOIN pg_class c ON n.oid = c.relnamespace AND c.relkind = 'r'
  WHERE n.nspname NOT LIKE 'pg_%'
    AND n.nspname NOT IN ('information_schema', 'public')
  GROUP BY n.nspname
  ORDER BY n.nspname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create tables info function in public schema
CREATE OR REPLACE FUNCTION public.get_tables_info(schema_name TEXT)
RETURNS TABLE(
  table_name TEXT,
  row_count BIGINT,
  has_rls BOOLEAN
) AS $$
DECLARE
  rec RECORD;
  row_count BIGINT;
  has_rls BOOLEAN;
BEGIN
  FOR rec IN 
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = schema_name AND c.relkind = 'r'
    ORDER BY c.relname
  LOOP
    EXECUTE format('SELECT count(*) FROM %I.%I', schema_name, rec.table_name) INTO row_count;
    
    EXECUTE format('
      SELECT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = %L AND c.relname = %L AND c.relrowsecurity
      )', schema_name, rec.table_name) INTO has_rls;
    
    table_name := rec.table_name;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies info function in public schema
CREATE OR REPLACE FUNCTION public.get_policies_info(schema_name TEXT)
RETURNS TABLE(
  tablename TEXT,
  policyname TEXT,
  cmd TEXT,
  roles TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg_policies.tablename::TEXT,
    pg_policies.policyname::TEXT,
    pg_policies.cmd::TEXT,
    pg_policies.roles::TEXT[]
  FROM pg_policies
  WHERE pg_policies.schemaname = schema_name
  ORDER BY pg_policies.tablename, pg_policies.policyname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_schemas_info() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tables_info(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_policies_info(TEXT) TO authenticated;

-- Create storage bucket for avatars if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', false)
  ON CONFLICT (id) DO NOTHING;

  -- Create storage policy for avatar uploads
  CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Policy to allow users to read their own avatar
  CREATE POLICY "Users can read their own avatar"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Policy to allow users to update their own avatar
  CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Policy to allow users to delete their own avatar
  CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION
  WHEN others THEN
    -- If policies already exist, ignore the error
    NULL;
END $$;