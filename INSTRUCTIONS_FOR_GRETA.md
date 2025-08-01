# INSTRUCTIONS FOR GRETA - SPORTIKO TRAINER PROJECT

**PROJECT: SPORTIKO – Trainer SaaS (Multi-Tenant, Multi-App)**  
**Last Updated: 2024-12-30**

## 🚨 CRITICAL RULE: UPDATE THE MASTER FILE
**Every change to database structure or access control MUST be reflected in:**
📄 `supabase/migrations/MASTER_RLS_POLICIES.sql`

## 🔒 PRIMARY SECURITY DESIGN
All apps use Postgres schemas for tenant isolation: `pt_{trainer_id}`

**Shared logic lives in:**
- `public` schema (auth, superadmins, function registry)
- `sportiko_pt` (shared cross-tenant reference tables)
- Role-based access is managed via Supabase Auth and RLS
- Policies are driven by helper functions such as `is_superadmin_safe()` and contextual claims

## 🧠 SUPERADMIN BEHAVIOR (GLOBAL CONTROL)

### Superadmin Capabilities:
Superadmins must be able to:
- ✅ Create a new tenant (i.e. a new trainer with schema `pt_{trainer_id}`)
- ✅ Assign email/password via Supabase Auth
- ✅ Delete or deactivate a trainer
- ✅ Update a trainer's profile or schema data
- ✅ Access and act on any schema (cross-tenant visibility)

## 🛠️ REQUIRED IMPLEMENTATIONS

### 1. 🔐 Superadmin Check Function
**Location:** `public.is_superadmin_safe()`

```sql
CREATE OR REPLACE FUNCTION public.is_superadmin_safe()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.superadmins sa
    WHERE sa.auth_id = auth.uid()
  );
$$;
```
✅ **Always use this in USING clauses** (to avoid infinite recursion and ensure security)

### 2. 🧱 RLS POLICY TEMPLATE FOR SUPERADMIN TABLES
**Policy Example** (for `public.trainers`):

```sql
-- Allow read/write access to superadmins only
CREATE POLICY "Superadmin full access"
ON public.trainers
FOR ALL
USING (public.is_superadmin_safe())
WITH CHECK (public.is_superadmin_safe());
```

🔁 **Repeat for:**
- `public.trainers`
- `public.superadmins`
- `sportiko_pt.*` (as needed)
- Each newly created `pt_*` schema (apply per-tenant RLS logic inside schema creation function)

### 3. 🔄 TENANT CREATION FUNCTION
**File:** `public.create_trainer_simple()`

**Responsibilities:**
- Create Supabase Auth user
- Create Postgres schema (`pt_{id}`)
- Seed schema with tables, policies
- Register trainer in `public.trainers`
- Return full trainer profile or ID

🔐 **Use SECURITY DEFINER + `is_superadmin_safe()` check**

### 4. ✅ RLS FUNCTION EXECUTION RIGHTS
Grant execution rights to roles:

```sql
GRANT EXECUTE ON FUNCTION public.create_trainer_simple() TO authenticated;
-- Optional: create dedicated 'superadmin' Postgres role
```

### 5. 📦 STORAGE POLICIES
Make sure `storage.objects` policies are also guarded using:

```sql
(auth.role() = 'authenticated' AND public.is_superadmin_safe())
```
💡 **Superadmins may need read/write access to all folders.**

## 🧪 TESTING CHECKLIST FOR SUPERADMIN ACTIONS
**Before merging:**
- ✅ Can create a new trainer via SQL or API?
- ✅ Trainer schema `pt_{id}` created and initialized?
- ✅ Trainer exists in `public.trainers` table?
- ✅ Can edit/delete any trainer as superadmin?
- ✅ Cannot perform same actions if not superadmin?
- ✅ Cross-schema access tested (e.g. SELECT from `pt_xyz.players`)?
- ✅ No infinite RLS recursion?
- ✅ Storage access allowed?

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

## 🛑 COMMON MISTAKES TO AVOID
- ❌ Forgetting to apply policies to new tables
- ❌ Using `auth.uid()` instead of `is_superadmin_safe()` in recursion-sensitive queries
- ❌ Missing grants on functions
- ❌ Updating tables directly without RLS
- ❌ Skipping policy test coverage

## 🎯 CURRENT POLICY STRUCTURE IN MASTER FILE

### 1. **Helper Functions**
- `is_superadmin_safe()` - Safe superadmin check (no recursion)
- `check_superadmins_table()` - Bypass RLS for table checks
- `is_superadmin()` - Main superadmin function
- `is_trainer()` - Check if user is trainer

### 2. **Enable RLS**
- On all tables in public schema

### 3. **Drop Existing Policies**
- Clean slate approach before applying new policies

### 4. **Table-specific Policies**
- Trainers, superadmins, shop_items, ads, orders, order_items

### 5. **Storage Policies**
- File upload/download permissions for avatars, shop-images, ads-images

### 6. **Tenant Schema Policies**
- Per-trainer schema creation with proper isolation

### 7. **Admin Functions**
- Superadmin-only operations like `admin_delete_trainer()`

### 8. **Grant Permissions**
- Function execution rights for authenticated users

## 🔧 REMEMBER FOR EVERY CHANGE:
- **Always use `is_superadmin_safe()` to avoid recursion**
- **Test policies with different user roles**
- **Document any complex policy logic**
- **Keep the master file organized and commented**
- **Update the master file BEFORE implementing in individual migrations**