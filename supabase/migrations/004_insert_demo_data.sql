-- ===================================================
-- MIGRATION 004: Insert Demo Data
-- DESCRIPTION: Insert basic demo data for testing
-- DATE: 2024-12-30
-- ===================================================

-- ===================================================
-- INSERT SUPERADMIN RECORD
-- ===================================================
INSERT INTO sportiko_trainer.superadmins (id, email, full_name, created_at) 
VALUES (
    'be9c6165-808a-4335-b90e-22f6d20328bf',
    'superadmin_pt@sportiko.eu',
    'Super Admin',
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

-- ===================================================
-- INSERT DEMO TRAINER
-- ===================================================
INSERT INTO sportiko_trainer.trainers (
    id, 
    email, 
    full_name, 
    subscription_plan,
    subscription_status,
    trial_end,
    is_active,
    created_at
) VALUES (
    'd45616a4-d90b-4358-b62c-9005f61e3d84',
    'trainer_pt@sportiko.eu',
    'Demo Trainer',
    'basic',
    'trial',
    NOW() + INTERVAL '14 days',
    true,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    trial_end = EXCLUDED.trial_end,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ===================================================
-- INSERT SAMPLE SHOP ITEMS
-- ===================================================
INSERT INTO sportiko_trainer.shop_items (name, description, price, category, stock_quantity, image_url, active) 
VALUES 
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
)
ON CONFLICT DO NOTHING;