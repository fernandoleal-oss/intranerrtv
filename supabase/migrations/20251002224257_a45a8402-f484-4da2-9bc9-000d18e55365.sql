-- Corrigir search_path da função de limpeza
CREATE OR REPLACE FUNCTION public.cleanup_old_budget_previews()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'budget-previews'
  AND created_at < now() - INTERVAL '10 days';
END;
$$;