-- Criar tabela de configuração de honorários por cliente
CREATE TABLE IF NOT EXISTS public.client_honorarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL UNIQUE,
  honorario_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_honorarios ENABLE ROW LEVEL SECURITY;

-- Admin pode gerenciar
CREATE POLICY "Admin can manage client honorarios"
ON public.client_honorarios
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Todos podem visualizar
CREATE POLICY "Everyone can view client honorarios"
ON public.client_honorarios
FOR SELECT
USING (true);

-- Inserir clientes com honorários predefinidos
INSERT INTO public.client_honorarios (client_name, honorario_percent) VALUES
  ('SBT', 20),
  ('IBJR', 20),
  ('+SBT', 20),
  ('Bridgestone', 20),
  ('Firestone', 20)
ON CONFLICT (client_name) DO NOTHING;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_client_honorarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_client_honorarios_updated_at
BEFORE UPDATE ON public.client_honorarios
FOR EACH ROW
EXECUTE FUNCTION public.update_client_honorarios_updated_at();