-- Fix avatar storage setup
DO $$
BEGIN
  -- Ensure bucket exists
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)  -- Setting public to true for easier access
  ON CONFLICT (id) DO UPDATE
  SET public = true;  -- Make sure existing bucket is public

  -- Drop existing policies to recreate them
  DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can read their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

  -- Create new policies
  -- Allow uploads to user's folder
  CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

  -- Allow reads from user's folder
  CREATE POLICY "Users can read their own avatar"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

  -- Allow updates to user's folder
  CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

  -- Allow deletions from user's folder
  CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

  -- Grant necessary permissions
  GRANT ALL ON bucket_avatars TO authenticated;
  
  RAISE NOTICE 'Avatar storage configuration complete';
END $$;

-- Function to clean up old avatars
CREATE OR REPLACE FUNCTION public.cleanup_old_avatars(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete old avatars from storage
  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = user_id::text
    AND created_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_old_avatars(UUID) TO authenticated;