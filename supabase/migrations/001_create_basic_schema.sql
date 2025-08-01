-- ===================================================
-- MIGRATION 001: Basic Schema and Tables Setup
-- DESCRIPTION: Create the core tables and basic structure
-- DATE: 2024-12-30
-- ===================================================

-- Create the main schema for the app
CREATE SCHEMA IF NOT EXISTS sportiko_trainer;

-- ===================================================
-- CORE TABLES
-- ===================================================

-- Trainers table
CREATE TABLE IF NOT EXISTS sportiko_trainer.trainers (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    subscription_plan TEXT DEFAULT 'basic',
    subscription_status TEXT DEFAULT 'trial',
    trial_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Superadmins table
CREATE TABLE IF NOT EXISTS sportiko_trainer.superadmins (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shop items table
CREATE TABLE IF NOT EXISTS sportiko_trainer.shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    category TEXT,
    stock_quantity INTEGER DEFAULT 0,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS sportiko_trainer.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    total_amount NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================
-- ENABLE RLS
-- ===================================================
ALTER TABLE sportiko_trainer.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportiko_trainer.orders ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- GRANT BASIC PERMISSIONS
-- ===================================================
GRANT USAGE ON SCHEMA sportiko_trainer TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA sportiko_trainer TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA sportiko_trainer TO authenticated;