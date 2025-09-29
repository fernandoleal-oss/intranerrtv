-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_finance_events_updated_at ON public.finance_events;
DROP TRIGGER IF EXISTS update_finance_reports_monthly_updated_at ON public.finance_reports_monthly;
DROP TRIGGER IF EXISTS update_finance_reports_annual_updated_at ON public.finance_reports_annual;

-- Tabela de eventos financeiros (cada linha importada)
CREATE TABLE IF NOT EXISTS public.finance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_month DATE NOT NULL,
  cliente TEXT NOT NULL,
  ap TEXT,
  descricao TEXT,
  fornecedor TEXT,
  valor_fornecedor_cents INTEGER NOT NULL DEFAULT 0,
  honorario_percent NUMERIC(5,2),
  honorario_agencia_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  raw JSONB,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_finance_events_ref_month ON public.finance_events(ref_month);
CREATE INDEX IF NOT EXISTS idx_finance_events_cliente ON public.finance_events(cliente);
CREATE INDEX IF NOT EXISTS idx_finance_events_fornecedor ON public.finance_events(fornecedor);
CREATE INDEX IF NOT EXISTS idx_finance_events_ap ON public.finance_events(ap);

-- Chave de idempotência para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_events_idempotent 
ON public.finance_events(ref_month, ap, fornecedor, total_cents, md5(COALESCE(descricao, '')));

-- Tabela de relatórios mensais
CREATE TABLE IF NOT EXISTS public.finance_reports_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_month DATE NOT NULL UNIQUE,
  kpis JSONB NOT NULL DEFAULT '{}'::jsonb,
  by_client JSONB NOT NULL DEFAULT '[]'::jsonb,
  by_supplier JSONB NOT NULL DEFAULT '[]'::jsonb,
  trends JSONB NOT NULL DEFAULT '[]'::jsonb,
  pdf_url TEXT,
  html_url TEXT,
  json_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_reports_monthly_ref_month ON public.finance_reports_monthly(ref_month);

-- Tabela de relatórios anuais
CREATE TABLE IF NOT EXISTS public.finance_reports_annual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL UNIQUE,
  kpis JSONB NOT NULL DEFAULT '{}'::jsonb,
  by_client JSONB NOT NULL DEFAULT '[]'::jsonb,
  by_supplier JSONB NOT NULL DEFAULT '[]'::jsonb,
  trends JSONB NOT NULL DEFAULT '[]'::jsonb,
  pdf_url TEXT,
  html_url TEXT,
  json_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de feriados para cálculo de dia útil
CREATE TABLE IF NOT EXISTS public.finance_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir feriados nacionais 2025-2026
INSERT INTO public.finance_holidays (holiday_date, description) VALUES
('2025-01-01', 'Ano Novo'),
('2025-04-18', 'Sexta-feira Santa'),
('2025-04-21', 'Tiradentes'),
('2025-05-01', 'Dia do Trabalho'),
('2025-09-07', 'Independência do Brasil'),
('2025-10-12', 'Nossa Senhora Aparecida'),
('2025-11-02', 'Finados'),
('2025-11-15', 'Proclamação da República'),
('2025-12-25', 'Natal'),
('2026-01-01', 'Ano Novo'),
('2026-04-03', 'Sexta-feira Santa'),
('2026-04-21', 'Tiradentes'),
('2026-05-01', 'Dia do Trabalho'),
('2026-09-07', 'Independência do Brasil'),
('2026-10-12', 'Nossa Senhora Aparecida'),
('2026-11-02', 'Finados'),
('2026-11-15', 'Proclamação da República'),
('2026-12-25', 'Natal')
ON CONFLICT (holiday_date) DO NOTHING;

-- Tabela de logs de importação
CREATE TABLE IF NOT EXISTS public.finance_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_month DATE NOT NULL,
  sheet_name TEXT,
  rows_imported INTEGER DEFAULT 0,
  rows_skipped INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_import_logs_ref_month ON public.finance_import_logs(ref_month);
CREATE INDEX IF NOT EXISTS idx_finance_import_logs_status ON public.finance_import_logs(status);

-- Recriar triggers
CREATE TRIGGER update_finance_events_updated_at
BEFORE UPDATE ON public.finance_events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finance_reports_monthly_updated_at
BEFORE UPDATE ON public.finance_reports_monthly
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finance_reports_annual_updated_at
BEFORE UPDATE ON public.finance_reports_annual
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.finance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_reports_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_reports_annual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_import_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin and finance can view finance_events" ON public.finance_events;
DROP POLICY IF EXISTS "Admin can manage finance_events" ON public.finance_events;
DROP POLICY IF EXISTS "Admin and finance can view monthly reports" ON public.finance_reports_monthly;
DROP POLICY IF EXISTS "Admin can manage monthly reports" ON public.finance_reports_monthly;
DROP POLICY IF EXISTS "Admin and finance can view annual reports" ON public.finance_reports_annual;
DROP POLICY IF EXISTS "Admin can manage annual reports" ON public.finance_reports_annual;
DROP POLICY IF EXISTS "Everyone can view holidays" ON public.finance_holidays;
DROP POLICY IF EXISTS "Admin can manage holidays" ON public.finance_holidays;
DROP POLICY IF EXISTS "Admin and finance can view import logs" ON public.finance_import_logs;
DROP POLICY IF EXISTS "Admin can manage import logs" ON public.finance_import_logs;

-- Admin e financeiro podem ver tudo
CREATE POLICY "Admin and finance can view finance_events"
ON public.finance_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'financeiro')
  )
);

CREATE POLICY "Admin can manage finance_events"
ON public.finance_events FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin and finance can view monthly reports"
ON public.finance_reports_monthly FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'financeiro')
  )
);

CREATE POLICY "Admin can manage monthly reports"
ON public.finance_reports_monthly FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin and finance can view annual reports"
ON public.finance_reports_annual FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'financeiro')
  )
);

CREATE POLICY "Admin can manage annual reports"
ON public.finance_reports_annual FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Everyone can view holidays"
ON public.finance_holidays FOR SELECT
USING (true);

CREATE POLICY "Admin can manage holidays"
ON public.finance_holidays FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin and finance can view import logs"
ON public.finance_import_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'financeiro')
  )
);

CREATE POLICY "Admin can manage import logs"
ON public.finance_import_logs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);