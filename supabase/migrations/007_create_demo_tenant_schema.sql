-- ===================================================
-- MIGRATION 007: Create Demo Tenant Schema
-- DESCRIPTION: Create the tenant schema for the demo trainer
-- DATE: 2024-12-30
-- ===================================================

-- Create the tenant schema for the demo trainer
SELECT sportiko_trainer.create_basic_tenant_schema('d45616a4-d90b-4358-b62c-9005f61e3d84');