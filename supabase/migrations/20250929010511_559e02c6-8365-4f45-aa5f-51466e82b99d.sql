-- Create comprehensive schema for the WE budget system

-- First, create enums for better type safety
CREATE TYPE budget_type AS ENUM ('filme', 'audio', 'cc', 'imagem');
CREATE TYPE budget_status AS ENUM ('rascunho', 'enviado_atendimento', 'aprovado');
CREATE TYPE user_role AS ENUM ('admin', 'rtv', 'financeiro');

-- Clients table (master data)
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  honorario_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products table (master data)
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, name)
);

-- User profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role user_role NOT NULL DEFAULT 'rtv',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaigns table (groups budgets)
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  responsible_user_id UUID NOT NULL REFERENCES public.profiles(id),
  period_start DATE,
  period_end DATE,
  status budget_status NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update budgets table structure
ALTER TABLE public.budgets 
  DROP COLUMN IF EXISTS tipo,
  ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id),
  ADD COLUMN type budget_type NOT NULL DEFAULT 'filme',
  ADD COLUMN client_id UUID REFERENCES public.clients(id),
  ADD COLUMN product_id UUID REFERENCES public.products(id),
  ADD COLUMN created_by_user_id UUID REFERENCES public.profiles(id);

-- Update versions table structure  
ALTER TABLE public.versions
  ADD COLUMN motivo_nova_versao TEXT,
  ADD COLUMN created_by_user_id UUID REFERENCES public.profiles(id);

-- Timeline/History table
CREATE TABLE public.budget_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Attachments table (for quote letters)
CREATE TABLE public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.versions(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default clients with honorario percentages
INSERT INTO public.clients (name, honorario_percentage) VALUES
  ('IBJR', 10.00),
  ('SBT', 12.00),
  ('MAIS SBT', 12.00),
  ('FIRESTONE', 10.00),
  ('BRIDGESTONE', 10.00),
  ('EMS', 0.00),
  ('TAO DEO', 0.00),
  ('IGC', 0.00),
  ('Torra Torra', 0.00),
  ('Shopee', 0.00),
  ('Tauá', 0.00),
  ('BYD', 0.00);

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients (admin can manage, others can read)
CREATE POLICY "Everyone can view clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Admin can manage clients" ON public.clients FOR ALL USING (
  EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for products
CREATE POLICY "Everyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admin can manage products" ON public.products FOR ALL USING (
  EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin can manage profiles" ON public.profiles FOR ALL USING (
  EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for campaigns
CREATE POLICY "Authenticated users can view campaigns" ON public.campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "RTV and Admin can manage campaigns" ON public.campaigns FOR ALL USING (
  EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'rtv'))
);

-- RLS Policies for budget_history
CREATE POLICY "Users can view budget history" ON public.budget_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert budget history" ON public.budget_history FOR INSERT TO authenticated WITH CHECK (user_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- RLS Policies for attachments  
CREATE POLICY "Users can view attachments" ON public.attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage attachments" ON public.attachments FOR ALL TO authenticated USING (true);

-- Update budget RLS to be more granular
DROP POLICY IF EXISTS "budgets_select" ON public.budgets;
DROP POLICY IF EXISTS "budgets_insert" ON public.budgets;  
DROP POLICY IF EXISTS "budgets_update" ON public.budgets;

CREATE POLICY "Authenticated users can view budgets" ON public.budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "RTV and Admin can manage budgets" ON public.budgets FOR ALL USING (
  EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'rtv'))
);

-- Update versions RLS
DROP POLICY IF EXISTS "versions_select" ON public.versions;
DROP POLICY IF EXISTS "versions_insert" ON public.versions;
DROP POLICY IF EXISTS "versions_update" ON public.versions;

CREATE POLICY "Authenticated users can view versions" ON public.versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "RTV and Admin can manage versions" ON public.versions FOR ALL USING (
  EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'rtv'))
);

-- Create updated timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_versions_updated_at BEFORE UPDATE ON public.versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup (create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow @we.com.br emails
  IF NEW.email NOT LIKE '%@we.com.br' THEN
    RAISE EXCEPTION 'Only @we.com.br email addresses are allowed';
  END IF;
  
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'rtv'  -- default role
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update the create budget function
CREATE OR REPLACE FUNCTION public.create_budget_with_version(
  p_campaign_id UUID,
  p_type budget_type
) RETURNS json AS $$
DECLARE 
  bid UUID := gen_random_uuid(); 
  vid UUID := gen_random_uuid();
  campaign_rec RECORD;
  disp TEXT;
  profile_id UUID;
BEGIN 
  -- Get campaign details
  SELECT c.*, cl.name as client_name, pr.name as product_name
  INTO campaign_rec
  FROM campaigns c
  JOIN clients cl ON c.client_id = cl.id
  JOIN products pr ON c.product_id = pr.id
  WHERE c.id = p_campaign_id;
  
  -- Get user profile
  SELECT id INTO profile_id FROM profiles WHERE user_id = auth.uid();
  
  -- Generate display ID: ORC-{CLIENT}-{PRODUCT}-{YYYYMMDD}-{seq}
  disp := 'ORC-' || 
          UPPER(REPLACE(campaign_rec.client_name, ' ', '')) || '-' ||
          UPPER(REPLACE(campaign_rec.product_name, ' ', '')) || '-' ||
          to_char(now() at time zone 'America/Sao_Paulo','YYYYMMDD') || '-' ||
          LPAD((extract(epoch from now())::text)[-2:], 2, '0');
  
  -- Insert budget
  INSERT INTO budgets(id, display_id, campaign_id, type, client_id, product_id, created_by_user_id, status)
  VALUES(bid, disp, p_campaign_id, p_type, campaign_rec.client_id, campaign_rec.product_id, profile_id, 'rascunho');
  
  -- Insert initial version
  INSERT INTO versions(id, budget_id, versao, created_by_user_id)
  VALUES(vid, bid, 1, profile_id);
  
  -- Log creation
  INSERT INTO budget_history(budget_id, user_id, action, details)
  VALUES(bid, profile_id, 'criado', json_build_object('display_id', disp, 'type', p_type));
  
  RETURN json_build_object('id', bid, 'display_id', disp, 'version_id', vid);
END $$ LANGUAGE plpgsql SET search_path = public;