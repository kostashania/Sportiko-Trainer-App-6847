-- Insert demo data for testing

-- First, let's make sure we have some sample trainers in the trainers table
-- Insert a demo trainer (this should match the demo user from your system)
INSERT INTO public.trainers (
  id,
  email,
  full_name,
  trial_end,
  is_active,
  created_at
) VALUES (
  'd45616a4-d90b-4358-b62c-9005f61e3d84', -- This should match your REAL_USERS.TRAINER
  'trainer_pt@sportiko.eu',
  'Test Trainer',
  NOW() + INTERVAL '14 days',
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  trial_end = EXCLUDED.trial_end,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Insert a few more sample trainers for testing
INSERT INTO public.trainers (
  id,
  email,
  full_name,
  trial_end,
  is_active,
  created_at
) VALUES 
  (
    gen_random_uuid(),
    'john.coach@sportiko.eu',
    'John Coach',
    NOW() + INTERVAL '7 days',
    true,
    NOW() - INTERVAL '5 days'
  ),
  (
    gen_random_uuid(),
    'sarah.trainer@sportiko.eu',
    'Sarah Trainer',
    NOW() - INTERVAL '2 days', -- Expired trial
    true,
    NOW() - INTERVAL '20 days'
  ),
  (
    gen_random_uuid(),
    'mike.fitness@sportiko.eu',
    'Mike Fitness',
    NOW() + INTERVAL '30 days',
    false, -- Inactive trainer
    NOW() - INTERVAL '10 days'
  )
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  trial_end = EXCLUDED.trial_end,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Make sure the superadmin exists
INSERT INTO public.superadmins (
  id,
  email,
  full_name,
  created_at
) VALUES (
  'be9c6165-808a-4335-b90e-22f6d20328bf', -- This should match your REAL_USERS.SUPERADMIN
  'superadmin_pt@sportiko.eu',
  'Super Admin',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Add some sample shop items
INSERT INTO public.shop_items (
  name,
  description,
  price,
  category,
  stock_quantity,
  image_url,
  active
) VALUES 
  (
    'Professional Soccer Ball',
    'FIFA approved soccer ball for professional training',
    29.99,
    'equipment',
    50,
    'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=400',
    true
  ),
  (
    'Training Cones Set',
    'Set of 20 orange training cones',
    19.99,
    'equipment',
    30,
    'https://images.unsplash.com/photo-1535131749006-b7d58b247b81?w=400',
    true
  ),
  (
    'Performance Cleats',
    'High-performance soccer cleats for all terrains',
    89.99,
    'apparel',
    15,
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    true
  ),
  (
    'Sports Water Bottle',
    'Insulated sports water bottle 750ml',
    12.99,
    'accessories',
    100,
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
    true
  ),
  (
    'Training Jersey',
    'Breathable training jersey - various sizes',
    24.99,
    'apparel',
    25,
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
    true
  )
ON CONFLICT DO NOTHING;

-- Add some sample ads
INSERT INTO public.ads (
  title,
  description,
  image_url,
  link,
  type,
  start_date,
  end_date,
  active
) VALUES 
  (
    'Premium Subscription Available',
    'Upgrade to premium for advanced analytics and unlimited players',
    'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=400',
    'https://sportiko.eu/premium',
    'superadmin',
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '30 days',
    true
  ),
  (
    'Summer Training Camp 2024',
    'Join our intensive summer training program',
    'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400',
    'https://sportiko.eu/camp',
    'trainer',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '60 days',
    true
  ),
  (
    'New Equipment Available',
    'Check out our latest training equipment collection',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    'https://sportiko.eu/shop',
    'trainer',
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '25 days',
    true
  )
ON CONFLICT DO NOTHING;

-- Create a sample tenant schema for the demo trainer
SELECT public.create_trainer_schema_safe('d45616a4-d90b-4358-b62c-9005f61e3d84');

RAISE NOTICE 'Demo data inserted successfully';