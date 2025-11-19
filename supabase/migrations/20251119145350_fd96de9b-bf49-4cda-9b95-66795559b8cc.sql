-- Corrigir ambiguidade na função create_budget_full_rpc
DROP FUNCTION IF EXISTS public.create_budget_full_rpc(text, jsonb, double precision);

CREATE OR REPLACE FUNCTION public.create_budget_full_rpc(p_type_text text, p_payload jsonb, p_total double precision)
RETURNS TABLE(id uuid, display_id text, version_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_budget_id  uuid;
  v_display_id text;
  v_version_id uuid;
  v_type       public.budget_type;
begin
  v_type := p_type_text::public.budget_type;

  insert into public.budgets (type, status)
  values (v_type, 'rascunho')
  returning budgets.id, budgets.display_id
  into v_budget_id, v_display_id;

  insert into public.versions (budget_id, versao, payload, total_geral)
  values (v_budget_id, 1, coalesce(p_payload, '{}'::jsonb), coalesce(p_total, 0))
  returning versions.id into v_version_id;

  return query select v_budget_id as id, v_display_id as display_id, v_version_id as version_id;
end;
$function$;