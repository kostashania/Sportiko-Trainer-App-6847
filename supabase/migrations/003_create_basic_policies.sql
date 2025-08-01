-- ===================================================
-- MIGRATION 003: Basic RLS Policies
-- DESCRIPTION: Create basic Row Level Security policies
-- DATE: 2024-12-30
-- ===================================================

-- ===================================================
-- TRAINERS TABLE POLICIES
-- ===================================================

-- Superadmins can do everything with trainers
CREATE POLICY "superadmin_manage_trainers" 
ON sportiko_trainer.trainers 
FOR ALL 
TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid()))
WITH CHECK (sportiko_trainer.is_superadmin(auth.uid()));

-- Trainers can view their own profile
CREATE POLICY "trainer_view_own_profile" 
ON sportiko_trainer.trainers 
FOR SELECT 
TO authenticated 
USING (id = auth.uid());

-- Trainers can update their own profile
CREATE POLICY "trainer_update_own_profile" 
ON sportiko_trainer.trainers 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ===================================================
-- SUPERADMINS TABLE POLICIES
-- ===================================================

-- Only superadmins can access superadmins table
CREATE POLICY "superadmin_table_access" 
ON sportiko_trainer.superadmins 
FOR ALL 
TO authenticated 
USING (
    auth.uid() = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid OR
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = 'superadmin_pt@sportiko.eu'
    )
)
WITH CHECK (
    auth.uid() = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid OR
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = 'superadmin_pt@sportiko.eu'
    )
);

-- ===================================================
-- SHOP ITEMS POLICIES
-- ===================================================

-- Anyone can view active shop items
CREATE POLICY "public_view_shop_items" 
ON sportiko_trainer.shop_items 
FOR SELECT 
TO authenticated 
USING (active = true);

-- Superadmins can manage shop items
CREATE POLICY "superadmin_manage_shop_items" 
ON sportiko_trainer.shop_items 
FOR ALL 
TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid()))
WITH CHECK (sportiko_trainer.is_superadmin(auth.uid()));

-- ===================================================
-- ORDERS POLICIES
-- ===================================================

-- Users can view their own orders
CREATE POLICY "user_view_own_orders" 
ON sportiko_trainer.orders 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Users can create their own orders
CREATE POLICY "user_create_own_orders" 
ON sportiko_trainer.orders 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Superadmins can view all orders
CREATE POLICY "superadmin_view_all_orders" 
ON sportiko_trainer.orders 
FOR SELECT 
TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid()));