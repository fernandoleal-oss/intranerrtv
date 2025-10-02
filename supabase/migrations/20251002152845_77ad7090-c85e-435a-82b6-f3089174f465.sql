-- Corrigir search_path das funções para segurança

-- Atualizar função tg_set_updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Atualizar função tg_rights_history
CREATE OR REPLACE FUNCTION public.tg_rights_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.rights_history(right_id, action, changed_by, snapshot)
  VALUES (
    OLD.id, 
    COALESCE(TG_ARGV[0], 'UPDATE'),
    COALESCE((current_setting('request.jwt.claims', true)::jsonb->>'email'), 'system'),
    to_jsonb(OLD)
  );
  RETURN NEW;
END;
$function$;