-- Fix subscription management policies and add missing columns
-- This migration addresses the "permission denied for table users" error

-- First, ensure the trainers table has all required subscription columns
ALTER TABLE public.trainers 
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' 
  CHECK (subscription_status IN ('trial','active','cancelled','expired')),
ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly' 
  CHECK (billing_cycle IN ('monthly','yearly')),
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP WITH TIME ZONE;

-- Create subscription_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly' 
    CHECK (billing_period IN ('monthly','yearly')),
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "public_view_active_plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "superadmin_manage_plans" ON public.subscription_plans;

-- Create policies for subscription_plans
CREATE POLICY "public_view_active_subscription_plans" 
ON public.subscription_plans 
FOR SELECT TO authenticated 
USING (is_active = true);

CREATE POLICY "superadmin_manage_subscription_plans" 
ON public.subscription_plans 
FOR ALL TO authenticated 
USING (public.is_superadmin_safe(auth.uid())) 
WITH CHECK (public.is_superadmin_safe(auth.uid()));

-- Insert default subscription plans if they don't exist
INSERT INTO public.subscription_plans (name, description, price, billing_period, features, is_active)
VALUES 
  ('Basic', 'Essential features for individual trainers', 9.99, 'monthly', 
   '{"players_limit": 20, "storage_limit": "1GB", "advanced_analytics": false, "team_features": false}', true),
  ('Pro', 'Advanced features for professional trainers', 19.99, 'monthly', 
   '{"players_limit": 50, "storage_limit": "5GB", "advanced_analytics": true, "team_features": false}', true),
  ('Team', 'Complete solution for training teams', 49.99, 'monthly', 
   '{"players_limit": 100, "storage_limit": "20GB", "advanced_analytics": true, "team_features": true}', true)
ON CONFLICT (name) DO NOTHING;

-- Create subscription history table for tracking changes
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES public.trainers(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'extended', 'cancelled', 'plan_changed', 'renewed'
  old_plan TEXT,
  new_plan TEXT,
  old_status TEXT,
  new_status TEXT,
  old_end_date TIMESTAMP WITH TIME ZONE,
  new_end_date TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on subscription_history
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Policies for subscription_history
CREATE POLICY "trainers_view_own_subscription_history" 
ON public.subscription_history 
FOR SELECT TO authenticated 
USING (trainer_id = auth.uid() OR public.is_superadmin_safe(auth.uid()));

CREATE POLICY "superadmin_manage_subscription_history" 
ON public.subscription_history 
FOR ALL TO authenticated 
USING (public.is_superadmin_safe(auth.uid())) 
WITH CHECK (public.is_superadmin_safe(auth.uid()));

-- Function to safely update trainer subscription plan
CREATE OR REPLACE FUNCTION public.update_trainer_subscription(
  trainer_id UUID,
  new_plan TEXT,
  new_status TEXT DEFAULT 'active'
) RETURNS BOOLEAN AS $$
DECLARE
  trainer_record RECORD;
  plan_record RECORD;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check permissions: superadmin or the trainer themselves
  IF NOT (public.is_superadmin_safe(current_user_id) OR current_user_id = trainer_id) THEN
    RAISE EXCEPTION 'Access denied: Only superadmins or the trainer themselves can update subscriptions';
  END IF;

  -- Get current trainer data
  SELECT * INTO trainer_record 
  FROM public.trainers 
  WHERE id = trainer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trainer not found';
  END IF;

  -- Get plan details
  SELECT * INTO plan_record 
  FROM public.subscription_plans 
  WHERE LOWER(name) = LOWER(new_plan) AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription plan "%" not found or inactive', new_plan;
  END IF;

  -- Update trainer subscription
  UPDATE public.trainers 
  SET 
    subscription_plan = plan_record.name,
    subscription_status = new_status,
    subscription_start = CASE 
      WHEN new_status = 'active' THEN NOW() 
      ELSE subscription_start 
    END,
    subscription_end = CASE 
      WHEN new_status = 'active' THEN 
        CASE 
          WHEN plan_record.billing_period = 'yearly' THEN NOW() + INTERVAL '1 year'
          ELSE NOW() + INTERVAL '1 month'
        END
      ELSE subscription_end 
    END,
    billing_cycle = plan_record.billing_period,
    updated_at = NOW()
  WHERE id = trainer_id;

  -- Log the action in subscription history
  INSERT INTO public.subscription_history (
    trainer_id,
    action,
    old_plan,
    new_plan,
    old_status,
    new_status,
    performed_by
  ) VALUES (
    trainer_id,
    'plan_changed',
    trainer_record.subscription_plan,
    plan_record.name,
    trainer_record.subscription_status,
    new_status,
    current_user_id
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extend subscription
CREATE OR REPLACE FUNCTION public.extend_trainer_subscription(
  trainer_id UUID,
  extension_days INTEGER,
  reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  trainer_record RECORD;
  new_end_date TIMESTAMP WITH TIME ZONE;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if user is superadmin
  IF NOT public.is_superadmin_safe(current_user_id) THEN
    RAISE EXCEPTION 'Only superadmins can extend subscriptions';
  END IF;

  -- Get current trainer data
  SELECT * INTO trainer_record 
  FROM public.trainers 
  WHERE id = trainer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trainer not found';
  END IF;

  -- Calculate new end date
  IF trainer_record.subscription_status = 'trial' THEN
    new_end_date := COALESCE(trainer_record.trial_end, NOW()) + (extension_days || ' days')::INTERVAL;
    -- Update trial end date
    UPDATE public.trainers 
    SET trial_end = new_end_date, updated_at = NOW() 
    WHERE id = trainer_id;
  ELSE
    new_end_date := COALESCE(trainer_record.subscription_end, NOW()) + (extension_days || ' days')::INTERVAL;
    -- Update subscription end date
    UPDATE public.trainers 
    SET subscription_end = new_end_date, updated_at = NOW() 
    WHERE id = trainer_id;
  END IF;

  -- Log the action
  INSERT INTO public.subscription_history (
    trainer_id,
    action,
    old_end_date,
    new_end_date,
    reason,
    performed_by
  ) VALUES (
    trainer_id,
    'extended',
    CASE 
      WHEN trainer_record.subscription_status = 'trial' THEN trainer_record.trial_end
      ELSE trainer_record.subscription_end 
    END,
    new_end_date,
    reason,
    current_user_id
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel subscription
CREATE OR REPLACE FUNCTION public.cancel_trainer_subscription(
  trainer_id UUID,
  reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  trainer_record RECORD;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if user is superadmin
  IF NOT public.is_superadmin_safe(current_user_id) THEN
    RAISE EXCEPTION 'Only superadmins can cancel subscriptions';
  END IF;

  -- Get current trainer data
  SELECT * INTO trainer_record 
  FROM public.trainers 
  WHERE id = trainer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trainer not found';
  END IF;

  -- Update trainer subscription
  UPDATE public.trainers 
  SET 
    subscription_status = 'cancelled',
    updated_at = NOW()
  WHERE id = trainer_id;

  -- Log the action
  INSERT INTO public.subscription_history (
    trainer_id,
    action,
    old_status,
    new_status,
    reason,
    performed_by
  ) VALUES (
    trainer_id,
    'cancelled',
    trainer_record.subscription_status,
    'cancelled',
    reason,
    current_user_id
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION public.update_trainer_subscription(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extend_trainer_subscription(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_trainer_subscription(UUID, TEXT) TO authenticated;

-- Update existing trainers to have default subscription data
UPDATE public.trainers 
SET 
  subscription_plan = COALESCE(subscription_plan, 'basic'),
  subscription_status = CASE 
    WHEN trial_end > NOW() THEN 'trial'
    WHEN trial_end <= NOW() THEN 'expired'
    ELSE 'trial'
  END
WHERE subscription_plan IS NULL OR subscription_status IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trainers_subscription_status ON public.trainers(subscription_status);
CREATE INDEX IF NOT EXISTS idx_trainers_subscription_plan ON public.trainers(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_trainers_trial_end ON public.trainers(trial_end);
CREATE INDEX IF NOT EXISTS idx_trainers_subscription_end ON public.trainers(subscription_end);
CREATE INDEX IF NOT EXISTS idx_subscription_history_trainer_id ON public.subscription_history(trainer_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_subscription_plans_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscription_plans_timestamp ON public.subscription_plans;
CREATE TRIGGER update_subscription_plans_timestamp
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_subscription_plans_timestamp();