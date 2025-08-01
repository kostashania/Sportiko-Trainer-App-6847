-- ===================================================
-- MIGRATION 002: Helper Functions
-- DESCRIPTION: Create core helper functions for authentication
-- DATE: 2024-12-30
-- ===================================================

-- ===================================================
-- SUPERADMIN CHECK FUNCTION (NO RECURSION)
-- ===================================================
CREATE OR REPLACE FUNCTION sportiko_trainer.is_superadmin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return false if no user_id
    IF user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check by known superadmin ID
    IF user_id = 'be9c6165-808a-4335-b90e-22f6d20328bf'::uuid THEN
        RETURN true;
    END IF;
    
    -- Check by known superadmin email
    IF EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = user_id 
        AND email = 'superadmin_pt@sportiko.eu'
    ) THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- ===================================================
-- GRANT PERMISSIONS
-- ===================================================
GRANT EXECUTE ON FUNCTION sportiko_trainer.is_superadmin(UUID) TO authenticated;