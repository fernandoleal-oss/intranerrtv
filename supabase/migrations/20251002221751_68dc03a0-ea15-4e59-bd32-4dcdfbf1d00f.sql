-- Criar tabela para armazenar saldos com fornecedores
CREATE TABLE IF NOT EXISTS finance_supplier_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor TEXT NOT NULL,
  saldo_cents INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(fornecedor)
);

-- Enable RLS
ALTER TABLE finance_supplier_balances ENABLE ROW LEVEL SECURITY;

-- Policies para visualização
CREATE POLICY "Users can view supplier balances"
ON finance_supplier_balances FOR SELECT
USING (true);

-- Policies para edição (apenas admin e financeiro)
CREATE POLICY "Admin and finance can manage balances"
ON finance_supplier_balances FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM profiles 
    WHERE role IN ('admin', 'financeiro', 'rtv')
  )
);

-- Policy para service role inserir
CREATE POLICY "Service role can insert balances"
ON finance_supplier_balances FOR INSERT
WITH CHECK (true);

-- Policy para service role atualizar
CREATE POLICY "Service role can update balances"
ON finance_supplier_balances FOR UPDATE
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_supplier_balances_updated_at
  BEFORE UPDATE ON finance_supplier_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar tabela para logs de sincronização
CREATE TABLE IF NOT EXISTS finance_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'manual' ou 'auto'
  sheet_url TEXT,
  sheets_synced JSONB DEFAULT '[]'::jsonb,
  rows_synced INTEGER DEFAULT 0,
  status TEXT NOT NULL, -- 'success', 'partial', 'error'
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE finance_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view sync logs"
ON finance_sync_logs FOR SELECT
USING (true);

CREATE POLICY "Service role can manage sync logs"
ON finance_sync_logs FOR ALL
USING (true);