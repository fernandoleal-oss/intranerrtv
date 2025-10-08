-- Corrigir função geradora de display_id para usar search_path seguro
DROP FUNCTION IF EXISTS public.generate_display_id() CASCADE;
DROP FUNCTION IF EXISTS public.set_display_id() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_display_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  month_key TEXT;
  next_num INTEGER;
BEGIN
  month_key := to_char(now(), 'YYYYMM');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(display_id FROM 12 FOR 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.budgets
  WHERE display_id LIKE 'WE-' || month_key || '-%';
  
  RETURN 'WE-' || month_key || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
    NEW.display_id := public.generate_display_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS trigger_set_display_id ON public.budgets;
CREATE TRIGGER trigger_set_display_id
BEFORE INSERT ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.set_display_id();