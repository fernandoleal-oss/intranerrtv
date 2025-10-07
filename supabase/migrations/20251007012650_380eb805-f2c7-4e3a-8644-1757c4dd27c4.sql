-- Corrigir search_path das funções - dropar trigger primeiro
DROP TRIGGER IF EXISTS trigger_set_budget_number ON public.budgets;
DROP FUNCTION IF EXISTS set_budget_number();
DROP FUNCTION IF EXISTS generate_budget_number();

-- Recriar funções com search_path correto
CREATE OR REPLACE FUNCTION generate_budget_number()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  next_num := nextval('budget_number_seq');
  RETURN LPAD(next_num::TEXT, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION set_budget_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.budget_number IS NULL THEN
    NEW.budget_number := generate_budget_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER trigger_set_budget_number
BEFORE INSERT ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION set_budget_number();