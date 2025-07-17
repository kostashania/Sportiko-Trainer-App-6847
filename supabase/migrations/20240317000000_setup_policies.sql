-- Create tables first
CREATE TABLE IF NOT EXISTS public.trainers (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    trial_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    trial_end TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.superadmins (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    category TEXT,
    stock_quantity INTEGER DEFAULT 0,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    link TEXT,
    type TEXT NOT NULL CHECK (type IN ('superadmin', 'trainer')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    total_amount NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id),
    shop_item_id UUID REFERENCES public.shop_items(id),
    quantity INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create is_superadmin function
CREATE OR REPLACE FUNCTION public.is_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.superadmins
        WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create is_trainer function
CREATE OR REPLACE FUNCTION public.is_trainer(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.trainers
        WHERE id = user_id AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trainers Policies
CREATE POLICY "Superadmins can do everything with trainers"
ON public.trainers TO authenticated
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Trainers can view and update their own profile"
ON public.trainers TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Superadmins Policies
CREATE POLICY "Only superadmins can access superadmins table"
ON public.superadmins TO authenticated
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

-- Shop Items Policies
CREATE POLICY "Anyone can view active shop items"
ON public.shop_items FOR SELECT
USING (active = true);

CREATE POLICY "Only superadmins can manage shop items"
ON public.shop_items FOR ALL TO authenticated
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

-- Ads Policies
CREATE POLICY "Users can view relevant active ads"
ON public.ads FOR SELECT
USING (
    active = true AND
    CURRENT_DATE BETWEEN start_date AND end_date AND
    (
        type = 'trainer' OR
        (type = 'superadmin' AND is_superadmin(auth.uid()))
    )
);

CREATE POLICY "Only superadmins can manage ads"
ON public.ads FOR ALL TO authenticated
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

-- Orders Policies
CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Superadmins can view all orders"
ON public.orders FOR SELECT TO authenticated
USING (is_superadmin(auth.uid()));

-- Order Items Policies
CREATE POLICY "Users can view their own order items"
ON public.order_items FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create their own order items"
ON public.order_items FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
);

CREATE POLICY "Superadmins can view all order items"
ON public.order_items FOR SELECT TO authenticated
USING (is_superadmin(auth.uid()));

-- Tenant Schema Creation Function
CREATE OR REPLACE FUNCTION public.create_tenant_schema(schema_name TEXT, trainer_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Create schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    
    -- Create tables in the new schema
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.players (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            birth_date DATE,
            position TEXT,
            contact TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )', schema_name);
        
    -- Add RLS policies for the tenant schema
    EXECUTE format('
        ALTER TABLE %I.players ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY tenant_isolation_policy ON %I.players
        USING (EXISTS (
            SELECT 1 FROM public.trainers
            WHERE id = auth.uid() AND id = %L
        ))', schema_name, schema_name, trainer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;