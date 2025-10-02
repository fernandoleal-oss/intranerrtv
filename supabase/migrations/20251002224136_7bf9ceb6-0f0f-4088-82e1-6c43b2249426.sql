-- Criar tabela de produtoras
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT CHECK (type IN ('producao', 'audio', 'imagem')),
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  cnpj TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de histórico de trabalhos com produtoras
CREATE TABLE IF NOT EXISTS public.supplier_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE,
  job_type TEXT,
  value_cents INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar bucket de storage para imagens temporárias
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'budget-previews',
  'budget-previews',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- RLS para suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view suppliers"
ON public.suppliers FOR SELECT
USING (true);

CREATE POLICY "RTV and Admin can manage suppliers"
ON public.suppliers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'rtv')
  )
);

-- RLS para supplier_jobs
ALTER TABLE public.supplier_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view supplier jobs"
ON public.supplier_jobs FOR SELECT
USING (true);

CREATE POLICY "RTV and Admin can manage supplier jobs"
ON public.supplier_jobs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'rtv')
  )
);

-- RLS para bucket
CREATE POLICY "Anyone can view budget previews"
ON storage.objects FOR SELECT
USING (bucket_id = 'budget-previews');

CREATE POLICY "Authenticated users can upload budget previews"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'budget-previews'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete budget previews"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'budget-previews'
  AND auth.role() = 'authenticated'
);

-- Trigger para updated_at
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para limpar imagens antigas (executar diariamente)
CREATE OR REPLACE FUNCTION public.cleanup_old_budget_previews()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'budget-previews'
  AND created_at < now() - INTERVAL '10 days';
END;
$$;