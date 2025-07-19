-- First, let's create the supporting tables and functions
-- This migration assumes users will be created via the Auth API

-- Ensure we have the necessary tables
CREATE TABLE IF NOT EXISTS public.superadmins (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.trainers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  trial_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  trial_end TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to handle user creation after auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
BEGIN
  user_email := NEW.email;
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  
  -- Check if this is a superadmin email
  IF user_email = 'superadmin_pt@sportiko.com' THEN
    INSERT INTO public.superadmins (id, email, full_name)
    VALUES (NEW.id, user_email, user_name)
    ON CONFLICT (id) DO NOTHING;
    
  -- Check if this is a trainer email
  ELSIF user_email = 'trainer_pt@sportiko.com' THEN
    -- Insert into public.trainers
    INSERT INTO public.trainers (id, email, full_name, trial_end)
    VALUES (NEW.id, user_email, user_name, now() + interval '14 days')
    ON CONFLICT (id) DO NOTHING;
    
    -- Insert into sportiko_pt.trainers
    INSERT INTO sportiko_pt.trainers (
      id, 
      name, 
      email, 
      role, 
      subscription_status, 
      trial_end
    )
    VALUES (
      NEW.id,
      user_name,
      user_email,
      'trainer',
      'trial',
      now() + interval '14 days'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create trainer schema
    PERFORM sportiko_pt.create_trainer_schema(NEW.id);
    
  -- Check if this is a player email
  ELSIF user_email = 'player_pt@sportiko.com' THEN
    -- We'll handle player creation separately since we need trainer_id
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create player after trainer exists
CREATE OR REPLACE FUNCTION public.create_test_player()
RETURNS VOID AS $$
DECLARE
  trainer_id UUID;
  player_id UUID;
  trainer_schema TEXT;
BEGIN
  -- Get trainer ID
  SELECT id INTO trainer_id 
  FROM auth.users 
  WHERE email = 'trainer_pt@sportiko.com';
  
  -- Get player ID
  SELECT id INTO player_id 
  FROM auth.users 
  WHERE email = 'player_pt@sportiko.com';
  
  -- Only proceed if both users exist
  IF trainer_id IS NOT NULL AND player_id IS NOT NULL THEN
    -- Create player auth record
    INSERT INTO sportiko_pt.players_auth (
      id,
      email,
      trainer_id
    )
    VALUES (
      player_id,
      'player_pt@sportiko.com',
      trainer_id
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create player in trainer schema
    trainer_schema := 'pt_' || replace(trainer_id::text, '-', '_');
    
    EXECUTE format('
      INSERT INTO %I.players (
        auth_id,
        name,
        contact_info
      )
      VALUES (
        %L,
        %L,
        %L
      )
      ON CONFLICT (auth_id) DO NOTHING
    ', 
      trainer_schema, 
      player_id, 
      'Test Player', 
      '{"email": "player_pt@sportiko.com", "phone": "555-1234"}'
    );
    
    -- Add sample exercise and homework
    PERFORM public.create_sample_data(trainer_id, trainer_schema, player_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create sample data
CREATE OR REPLACE FUNCTION public.create_sample_data(
  trainer_id UUID, 
  trainer_schema TEXT, 
  player_id UUID
)
RETURNS VOID AS $$
DECLARE
  exercise_id UUID;
  homework_id UUID;
BEGIN
  -- Create exercise
  exercise_id := gen_random_uuid();
  EXECUTE format('
    INSERT INTO %I.exercises (
      id,
      name,
      description,
      category,
      difficulty,
      instructions
    )
    VALUES (
      %L,
      %L,
      %L,
      %L,
      %L,
      %L
    )
    ON CONFLICT (id) DO NOTHING
  ', 
    trainer_schema,
    exercise_id,
    'Push-ups',
    'Basic upper body exercise for strength',
    'Strength',
    'Beginner',
    '{"steps": ["Start in plank position", "Lower your body", "Push back up"]}'
  );
  
  -- Get player record ID from trainer schema
  EXECUTE format('
    SELECT id FROM %I.players WHERE auth_id = %L LIMIT 1
  ', trainer_schema, player_id) INTO player_id;
  
  IF player_id IS NOT NULL THEN
    -- Create homework assignment
    homework_id := gen_random_uuid();
    EXECUTE format('
      INSERT INTO %I.homework (
        id,
        player_id,
        title,
        description,
        due_date
      )
      VALUES (
        %L,
        %L,
        %L,
        %L,
        %L
      )
      ON CONFLICT (id) DO NOTHING
    ', 
      trainer_schema,
      homework_id,
      player_id,
      'Week 1 Strength Training',
      'Complete these exercises 3 times this week',
      now() + interval '7 days'
    );
    
    -- Add homework item
    EXECUTE format('
      INSERT INTO %I.homework_items (
        homework_id,
        exercise_id,
        sets,
        reps,
        notes
      )
      VALUES (
        %L,
        %L,
        %L,
        %L,
        %L
      )
      ON CONFLICT (homework_id, exercise_id) DO NOTHING
    ', 
      trainer_schema,
      homework_id,
      exercise_id,
      3,
      10,
      'Focus on proper form'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;