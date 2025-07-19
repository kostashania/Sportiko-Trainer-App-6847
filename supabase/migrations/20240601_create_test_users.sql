-- Create test users for Sportiko Trainer platform

-- 1. Create users in auth.users (this would normally be done via API)
-- Note: In a real scenario, you'd use supabase auth.signup() API, not direct SQL
-- This is just for demonstration purposes

-- Create superadmin user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at
) VALUES (
  gen_random_uuid(),
  'superadmin_pt@sportiko.com',
  crypt('pass123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Super Admin"}',
  now()
) ON CONFLICT (email) DO NOTHING;

-- Create trainer user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at
) VALUES (
  gen_random_uuid(),
  'trainer_pt@sportiko.com',
  crypt('pass123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test Trainer"}',
  now()
) ON CONFLICT (email) DO NOTHING;

-- Create player user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at
) VALUES (
  gen_random_uuid(),
  'player_pt@sportiko.com',
  crypt('pass123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test Player"}',
  now()
) ON CONFLICT (email) DO NOTHING;

-- 2. Add users to their respective roles

-- Get user IDs
DO $$
DECLARE
  superadmin_id UUID;
  trainer_id UUID;
  player_id UUID;
  trainer_schema TEXT;
BEGIN
  -- Get user IDs
  SELECT id INTO superadmin_id FROM auth.users WHERE email = 'superadmin_pt@sportiko.com';
  SELECT id INTO trainer_id FROM auth.users WHERE email = 'trainer_pt@sportiko.com';
  SELECT id INTO player_id FROM auth.users WHERE email = 'player_pt@sportiko.com';
  
  -- Create superadmin record
  INSERT INTO public.superadmins (id, email, full_name)
  VALUES (
    superadmin_id,
    'superadmin_pt@sportiko.com',
    'Super Admin'
  ) ON CONFLICT (id) DO NOTHING;

  -- Create trainer record in public schema
  INSERT INTO public.trainers (id, email, full_name, trial_end)
  VALUES (
    trainer_id,
    'trainer_pt@sportiko.com',
    'Test Trainer',
    now() + interval '14 days'
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Create trainer record in sportiko_pt schema
  INSERT INTO sportiko_pt.trainers (
    id, 
    name, 
    email, 
    role, 
    subscription_status, 
    trial_end
  )
  VALUES (
    trainer_id,
    'Test Trainer',
    'trainer_pt@sportiko.com',
    'trainer',
    'trial',
    now() + interval '14 days'
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Create trainer schema
  trainer_schema := 'pt_' || replace(trainer_id::text, '-', '_');
  
  -- Ensure schema exists (either through the trigger or manually)
  PERFORM sportiko_pt.create_trainer_schema(trainer_id);
  
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
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Create player record in trainer's schema
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
    )', 
    trainer_schema, 
    player_id, 
    'Test Player', 
    '{"email": "player_pt@sportiko.com", "phone": "555-1234"}'
  );
  
  RAISE NOTICE 'Created users: Superadmin (%), Trainer (%), Player (%)', superadmin_id, trainer_id, player_id;
END $$;

-- 3. Add some sample data for testing

-- Add a sample exercise
DO $$
DECLARE
  trainer_id UUID;
  trainer_schema TEXT;
  player_id UUID;
  exercise_id UUID;
  homework_id UUID;
BEGIN
  -- Get trainer and derive schema name
  SELECT id INTO trainer_id FROM sportiko_pt.trainers WHERE email = 'trainer_pt@sportiko.com';
  trainer_schema := 'pt_' || replace(trainer_id::text, '-', '_');
  
  -- Get player ID
  EXECUTE format('
    SELECT id FROM %I.players WHERE name = %L LIMIT 1
  ', trainer_schema, 'Test Player') INTO player_id;
  
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
  ', 
    trainer_schema,
    exercise_id,
    'Push-ups',
    'Basic upper body exercise for strength',
    'Strength',
    'Beginner',
    '{"steps": ["Start in plank position", "Lower your body", "Push back up"]}'
  );
  
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
  ', 
    trainer_schema,
    homework_id,
    exercise_id,
    3,
    10,
    'Focus on proper form'
  );
END $$;