-- Fix security warning by setting search_path in function
create or replace function create_budget_with_version(p_tipo text)
returns json language plpgsql security definer 
set search_path = public
as $$
declare 
  bid uuid := gen_random_uuid(); 
  vid uuid := gen_random_uuid();
  disp text := 'ORC-' || upper(p_tipo) || '-' || to_char(now() at time zone 'America/Sao_Paulo','YYYYMMDD') || '-' || extract(epoch from now())::text;
begin 
  insert into budgets(id, display_id, tipo) values(bid, disp, p_tipo);
  insert into versions(id, budget_id, versao) values(vid, bid, 1);
  return json_build_object('id', bid, 'display_id', disp);
end $$;