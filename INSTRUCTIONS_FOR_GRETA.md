# INSTRUCTIONS FOR GRETA - SPORTIKO TRAINER PROJECT

**PROJECT: SPORTIKO – Trainer SaaS (Multi-Tenant, Multi-App)**
**Last Updated: 2024-12-30 - Fixed schema structure and connection issues**

## 🚨 CRITICAL RULE: UPDATE THE MASTER FILE
**Every change to database structure or access control MUST be reflected in:**
📄 `supabase/migrations/MASTER_RLS_POLICIES.sql`

## 🔒 PRIMARY SECURITY DESIGN - UPDATED SCHEMA STRUCTURE

**NEW ARCHITECTURE (2024-12-30):**
- `sportiko_trainer` schema - Main app schema (replaces public for app-specific tables)
- `st_{trainer_id}` schemas - Per-trainer tenant schemas (replaces pt_ prefix)
- `public` schema - Only for auth functions and cross-app utilities

### Schema Breakdown:
```
sportiko_trainer/           # Main app schema
├── trainers               # Trainer profiles
├── superadmins           # Superadmin users  
├── shop_items            # E-commerce products
├── ads                   # Advertisement system
├── orders                # Order management
├── order_items           # Order line items
├── subscription_plans    # Available plans
└── subscription_history  # Audit trail

st_{trainer_id}/           # Per-trainer schemas
├── players               # Player profiles
├── homework              # Assignments
├── payments              # Payment tracking
└── assessments           # Performance data

public/                    # Shared utilities only
├── Helper functions only
└── Cross-app utilities
```

## 🧠 SUPERADMIN BEHAVIOR (GLOBAL CONTROL)

### Superadmin Capabilities:
Superadmins must be able to:
- ✅ Create a new tenant (i.e. a new trainer with schema `st_{trainer_id}`)
- ✅ Assign email/password via Supabase Auth
- ✅ Delete or deactivate a trainer
- ✅ Update a trainer's profile or schema data
- ✅ Access and act on any schema (cross-tenant visibility)
- ✅ Manage subscription plans and trainer subscriptions
- ✅ Extend trial periods and change billing cycles
- ✅ View subscription history and analytics

## 🛠️ REQUIRED IMPLEMENTATIONS

### 1. 🔐 Superadmin Check Function
**Location:** `sportiko_trainer.is_superadmin()`

```sql
CREATE OR REPLACE FUNCTION sportiko_trainer.is_superadmin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Check by known superadmin ID first
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
  
  -- Check if user exists in superadmins table
  RETURN EXISTS (
    SELECT 1 FROM sportiko_trainer.superadmins 
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

✅ **Always use this in USING clauses** (to avoid infinite recursion and ensure security)

### 2. 🧱 RLS POLICY TEMPLATE FOR SUPERADMIN TABLES

**Policy Example** (for `sportiko_trainer.trainers`):
```sql
-- Allow read/write access to superadmins only
CREATE POLICY "superadmin_full_access_trainers" 
ON sportiko_trainer.trainers FOR ALL TO authenticated 
USING (sportiko_trainer.is_superadmin(auth.uid())) 
WITH CHECK (sportiko_trainer.is_superadmin(auth.uid()));
```

🔁 **Repeat for:**
- `sportiko_trainer.trainers`
- `sportiko_trainer.superadmins`
- `sportiko_trainer.subscription_plans`
- `sportiko_trainer.subscription_history`
- `sportiko_trainer.shop_items`
- `sportiko_trainer.ads`
- `sportiko_trainer.orders`
- `sportiko_trainer.order_items`
- Each newly created `st_*` schema (apply per-tenant RLS logic inside schema creation function)

### 3. 🔄 TENANT CREATION FUNCTION
**File:** `sportiko_trainer.create_basic_tenant_schema()`

**Responsibilities:**
- Create Postgres schema (`st_{id}`)
- Seed schema with tables, policies
- Register trainer in `sportiko_trainer.trainers`
- Set up default subscription plan and trial period
- Return full trainer profile or ID

🔐 **Use SECURITY DEFINER + `sportiko_trainer.is_superadmin()` check**

### 4. ✅ RLS FUNCTION EXECUTION RIGHTS
Grant execution rights to roles:
```sql
GRANT EXECUTE ON FUNCTION sportiko_trainer.create_basic_tenant_schema(UUID) TO authenticated;
GRANT USAGE ON SCHEMA sportiko_trainer TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA sportiko_trainer TO authenticated;
```

### 5. 📦 STORAGE POLICIES
Make sure `storage.objects` policies are also guarded using:
```sql
(auth.role() = 'authenticated' AND sportiko_trainer.is_superadmin(auth.uid()))
```

💡 **Superadmins may need read/write access to all folders.**

### 6. 💳 SUBSCRIPTION MANAGEMENT FUNCTIONS

**Required Functions:**
- `sportiko_trainer.update_trainer_subscription(trainer_id, new_plan, new_status)`
- `sportiko_trainer.extend_trainer_subscription(trainer_id, extension_days, reason)`
- `sportiko_trainer.cancel_trainer_subscription(trainer_id, reason)`

**Tables:**
- `sportiko_trainer.subscription_plans` - Available subscription tiers
- `sportiko_trainer.subscription_history` - Audit trail for subscription changes

**Columns in `sportiko_trainer.trainers`:**
- `subscription_plan` TEXT DEFAULT 'basic'
- `subscription_status` TEXT DEFAULT 'trial'
- `subscription_start` TIMESTAMP
- `subscription_end` TIMESTAMP
- `billing_cycle` TEXT DEFAULT 'monthly'

## 🧪 TESTING CHECKLIST FOR SUPERADMIN ACTIONS

**Before merging:**
- ✅ Can create a new trainer via SQL or API?
- ✅ Trainer schema `st_{id}` created and initialized?
- ✅ Trainer exists in `sportiko_trainer.trainers` table?
- ✅ Can edit/delete any trainer as superadmin?
- ✅ Cannot perform same actions if not superadmin?
- ✅ Cross-schema access tested (e.g. SELECT from `st_xyz.players`)?
- ✅ No infinite RLS recursion?
- ✅ Storage access allowed?
- ✅ Can change trainer subscription plans?
- ✅ Can extend trial periods?
- ✅ Subscription history is logged correctly?
- ✅ Trainers can only update their own subscriptions (if allowed)?

## 📋 MASTER FILE UPDATE STEPS

1. Open `supabase/migrations/MASTER_RLS_POLICIES.sql`
2. Add or edit the RLS policies / helper functions / grants
3. Add a comment describing what and why you changed
4. Update the **Last Updated** date
5. Save and test your changes locally and in staging

## 🧠 DESIGN PRINCIPLES

| Principle | Description |
|-----------|-------------|
| 🔐 **Least Privilege** | Users only see their data (except superadmin) |
| ⚠️ **Explicit Access** | RLS is enabled on every table |
| 🚫 **Clean Slate** | Old policies are dropped before re-applying |
| 💬 **Documented Logic** | Every section in MASTER file has comments |
| 🧪 **Tested** | All policies tested via Supabase Auth with real roles |
| 💳 **Subscription Isolation** | Trainers can only manage their own subscriptions |
| 🏗️ **Schema Isolation** | Each app has its own dedicated schema |

## 🛑 COMMON MISTAKES TO AVOID

- ❌ Forgetting to apply policies to new tables
- ❌ Using wrong schema name (public vs sportiko_trainer)
- ❌ Missing grants on functions
- ❌ Updating tables directly without RLS
- ❌ Skipping policy test coverage
- ❌ Allowing trainers to modify subscription plans they shouldn't have access to
- ❌ Not logging subscription changes in history table
- ❌ **NEW: Using old pt_ prefix instead of st_ for tenant schemas**
- ❌ **NEW: Referencing public schema tables that moved to sportiko_trainer**

## 🎯 CURRENT POLICY STRUCTURE IN MASTER FILE

### 1. **Helper Functions**
- `sportiko_trainer.is_superadmin()` - Safe superadmin check (no recursion)
- Schema-specific functions in `sportiko_trainer` schema

### 2. **Enable RLS**
- On all tables in `sportiko_trainer` schema
- Including subscription_plans and subscription_history

### 3. **Drop Existing Policies**
- Clean slate approach before applying new policies

### 4. **Table-specific Policies**
- All tables now in `sportiko_trainer` schema
- Trainers, superadmins, shop_items, ads, orders, order_items
- subscription_plans, subscription_history

### 5. **Storage Policies**
- File upload/download permissions for avatars, shop-images, ads-images

### 6. **Tenant Schema Policies**
- Per-trainer schema creation with proper isolation using `st_` prefix

### 7. **Admin Functions**
- Superadmin-only operations
- Subscription management functions

### 8. **Grant Permissions**
- Function execution rights for authenticated users
- Schema usage permissions

## 🔧 REMEMBER FOR EVERY CHANGE:

- **Always use `sportiko_trainer.is_superadmin()` to avoid recursion**
- **Use `st_` prefix for tenant schemas, not `pt_`**
- **All app tables are in `sportiko_trainer` schema, not `public`**
- **Test policies with different user roles**
- **Document any complex policy logic**
- **Keep the master file organized and commented**
- **Update the master file BEFORE implementing in individual migrations**
- **Always log subscription changes in subscription_history table**
- **Validate subscription plan exists and is active before updates**

## 🆕 RECENT CHANGES (2024-12-30)

### Major Schema Restructure:
1. **Moved from `public` to `sportiko_trainer` schema:**
   - All app-specific tables now in dedicated schema
   - Avoids namespace collisions with other apps
   - Cleaner separation of concerns

2. **Changed tenant schema prefix:**
   - From `pt_` to `st_` (SportikoTrainer)
   - More descriptive and app-specific
   - Avoids conflicts with other Sportiko apps

3. **Updated all functions and policies:**
   - Schema-qualified function names
   - Updated RLS policies for new schema structure
   - Fixed connection issues and permission errors

4. **Client Configuration:**
   - Updated Supabase client to use `sportiko_trainer` schema
   - Fixed tenant schema naming in client code
   - Updated all database queries to use correct schema

### Testing Completed:
- ✅ Schema migration successful
- ✅ All tables accessible in new schema
- ✅ RLS policies working correctly
- ✅ Tenant schema creation functional
- ✅ Superadmin permissions verified
- ✅ Client connection restored

## 🔧 TROUBLESHOOTING CONNECTION ISSUES

### Common Problems and Solutions:

1. **"relation does not exist" errors:**
   - Check if using correct schema name (`sportiko_trainer` not `public`)
   - Verify table exists in correct schema
   - Update client configuration

2. **Permission denied errors:**
   - Verify RLS policies are applied correctly
   - Check function grants and schema permissions
   - Ensure user has correct role

3. **Function not found errors:**
   - Check function exists in correct schema
   - Verify GRANT EXECUTE permissions
   - Update function calls to use schema-qualified names

4. **Connection timeout/lost:**
   - Verify Supabase credentials are correct
   - Check network connectivity
   - Ensure schema exists and is accessible