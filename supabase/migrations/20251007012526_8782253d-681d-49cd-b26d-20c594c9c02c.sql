-- Adicionar campo budget_number na tabela budgets
ALTER TABLE public.budgets 
ADD COLUMN budget_number TEXT;

-- Criar sequência para gerar números sequenciais de orçamento
CREATE SEQUENCE IF NOT EXISTS budget_number_seq START WITH 1;

-- Função para gerar número de orçamento com 3 dígitos
CREATE OR REPLACE FUNCTION generate_budget_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  next_num := nextval('budget_number_seq');
  RETURN LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar automaticamente o número do orçamento ao criar um novo budget
CREATE OR REPLACE FUNCTION set_budget_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.budget_number IS NULL THEN
    NEW.budget_number := generate_budget_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_budget_number
BEFORE INSERT ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION set_budget_number();

-- Atualizar budgets existentes com números sequenciais
DO $$
DECLARE
  budget_record RECORD;
BEGIN
  FOR budget_record IN 
    SELECT id FROM public.budgets WHERE budget_number IS NULL ORDER BY created_at
  LOOP
    UPDATE public.budgets 
    SET budget_number = generate_budget_number()
    WHERE id = budget_record.id;
  END LOOP;
END $$;