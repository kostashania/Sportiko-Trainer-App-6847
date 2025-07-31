-- Create the missing tenant schema for the demo trainer
-- This should be run to fix the trainer login issues

-- First, ensure the trainer exists in the trainers table
INSERT INTO public.trainers (
  id, 
  email, 
  full_name, 
  trial_end, 
  is_active,
  created_at
) VALUES (
  'd45616a4-d90b-4358-b62c-9005f61e3d84',
  'trainer_pt@sportiko.eu',
  'Demo Trainer',
  NOW() + INTERVAL '14 days',
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  trial_end = EXCLUDED.trial_end,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Create the tenant schema for the trainer
SELECT public.create_basic_tenant_schema('d45616a4-d90b-4358-b62c-9005f61e3d84');

-- Verify the schema was created and add some sample data
DO $$
DECLARE
  schema_name TEXT := 'pt_d45616a4_d90b_4358_b62c_9005f61e3d84';
  player_1_id UUID;
  player_2_id UUID;
  player_3_id UUID;
  homework_id UUID;
  exercise_id UUID;
BEGIN
  -- Insert sample players
  EXECUTE format('
    INSERT INTO %I.players (name, position, contact, birth_date) 
    VALUES 
      (''John Doe'', ''Forward'', ''john@example.com'', ''2000-01-01''),
      (''Sarah Smith'', ''Midfielder'', ''sarah@example.com'', ''2001-03-15''),
      (''Mike Johnson'', ''Defender'', ''mike@example.com'', ''1999-11-10'')
    ON CONFLICT DO NOTHING
  ', schema_name);

  -- Get player IDs for homework assignments
  EXECUTE format('SELECT id FROM %I.players WHERE name = ''John Doe'' LIMIT 1', schema_name) INTO player_1_id;
  
  IF player_1_id IS NOT NULL THEN
    -- Create sample homework
    homework_id := gen_random_uuid();
    EXECUTE format('
      INSERT INTO %I.homework (id, player_id, title, description, due_date, completed)
      VALUES (%L, %L, ''Weekly Training'', ''Complete strength and cardio exercises'', %L, false)
      ON CONFLICT DO NOTHING
    ', schema_name, homework_id, player_1_id, NOW() + INTERVAL '7 days');

    -- Create sample payment
    EXECUTE format('
      INSERT INTO %I.payments (player_id, amount, due_date, paid)
      VALUES (%L, 50.00, %L, false)
      ON CONFLICT DO NOTHING
    ', schema_name, player_1_id, NOW() + INTERVAL '30 days');
  END IF;

  RAISE NOTICE 'Sample data added to schema %', schema_name;
END
$$;

-- Verify the tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'pt_d45616a4_d90b_4358_b62c_9005f61e3d84'
ORDER BY table_name;

-- Check sample data
SELECT 'players' as table_name, count(*) as row_count 
FROM pt_d45616a4_d90b_4358_b62c_9005f61e3d84.players
UNION ALL
SELECT 'homework' as table_name, count(*) as row_count 
FROM pt_d45616a4_d90b_4358_b62c_9005f61e3d84.homework
UNION ALL
SELECT 'payments' as table_name, count(*) as row_count 
FROM pt_d45616a4_d90b_4358_b62c_9005f61e3d84.payments;