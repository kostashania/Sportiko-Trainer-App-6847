-- ===================================================
-- MIGRATION 005: Subscription Management
-- DESCRIPTION: Add subscription plans and management functions
-- DATE: 2024-12-30
-- ===================================================

-- ===================================================
-- SUBSCRIPTION PLANS TABLE
-- ===================================================
CREATE TABLE IF NOT EXISTS sportiko_trainer.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sportiko_trainer.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans
CREATE POLICY "public_view_subscription_plans" 
ON sportiko_trainer.subscription_plans 
FOR SELECT 
TO authenticated 
USING (is_active = true);

-- Superadmins can manage plans
CREATE POLICY "superadmin_manage_subscription_plans" 
ON sportiko_trainer.subscription_plans 
FOR ALL 
TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid()))
WITH CHECK (sportiko_trainer.is_superadmin(auth.uid()));

-- ===================================================
-- INSERT DEFAULT SUBSCRIPTION PLANS
-- ===================================================
INSERT INTO sportiko_trainer.subscription_plans (name, description, price, billing_period, features, is_active) 
VALUES 
(
    'Basic',
    'Essential features for individual trainers',
    9.99,
    'monthly',
    '{"players_limit": 20, "storage_limit": "1GB", "advanced_analytics": false, "team_features": false}',
    true
),
(
    'Pro',
    'Advanced features for professional trainers',
    19.99,
    'monthly',
    '{"players_limit": 50, "storage_limit": "5GB", "advanced_analytics": true, "team_features": false}',
    true
),
(
    'Team',
    'Complete solution for training teams',
    49.99,
    'monthly',
    '{"players_limit": 100, "storage_limit": "20GB", "advanced_analytics": true, "team_features": true}',
    true
)
ON CONFLICT (name) DO NOTHING;

-- ===================================================
-- SUBSCRIPTION MANAGEMENT FUNCTION
-- ===================================================
CREATE OR REPLACE FUNCTION sportiko_trainer.update_trainer_subscription(
    trainer_id UUID,
    new_plan TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only superadmins can update subscriptions
    IF NOT sportiko_trainer.is_superadmin(auth.uid()) THEN
        RAISE EXCEPTION 'Only superadmins can update subscriptions';
    END IF;
    
    -- Validate plan exists
    IF NOT EXISTS (
        SELECT 1 FROM sportiko_trainer.subscription_plans 
        WHERE LOWER(name) = LOWER(new_plan) AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Invalid or inactive subscription plan: %', new_plan;
    END IF;
    
    -- Update trainer's subscription
    UPDATE sportiko_trainer.trainers
    SET 
        subscription_plan = new_plan,
        updated_at = NOW()
    WHERE id = trainer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trainer not found: %', trainer_id;
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION sportiko_trainer.update_trainer_subscription(UUID, TEXT) TO authenticated;
GRANT ALL ON sportiko_trainer.subscription_plans TO authenticated;