-- Create a simplified budget creation function that doesn't require campaign
CREATE OR REPLACE FUNCTION public.create_simple_budget(p_type budget_type)
RETURNS json
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE 
  bid UUID := gen_random_uuid(); 
  vid UUID := gen_random_uuid();
  disp TEXT;
  profile_id UUID;
BEGIN 
  -- Get user profile
  SELECT id INTO profile_id FROM profiles WHERE user_id = auth.uid();
  
  -- Generate display ID: ORC-{TYPE}-{YYYYMMDD}-{seq}
  disp := 'ORC-' || 
          UPPER(p_type::text) || '-' ||
          to_char(now() at time zone 'America/Sao_Paulo','YYYYMMDD') || '-' ||
          LPAD((extract(epoch from now())::text)[-2:], 2, '0');
  
  -- Insert budget
  INSERT INTO budgets(id, display_id, type, created_by_user_id, status)
  VALUES(bid, disp, p_type, profile_id, 'rascunho');
  
  -- Insert initial version
  INSERT INTO versions(id, budget_id, versao, created_by_user_id)
  VALUES(vid, bid, 1, profile_id);
  
  -- Log creation
  INSERT INTO budget_history(budget_id, user_id, action, details)
  VALUES(bid, profile_id, 'criado', json_build_object('display_id', disp, 'type', p_type));
  
  RETURN json_build_object('id', bid, 'display_id', disp, 'version_id', vid);
END $function$;