-- Corrigir políticas RLS com abordagem mais simples e robusta

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admin and finance can insert import logs" ON public.finance_import_logs;
DROP POLICY IF EXISTS "Admin and finance can update import logs" ON public.finance_import_logs;
DROP POLICY IF EXISTS "Admin and finance can insert events" ON public.finance_events;
DROP POLICY IF EXISTS "Admin and finance can update events" ON public.finance_events;

-- finance_import_logs: permitir insert para usuários autenticados com role apropriada
CREATE POLICY "Authenticated users can insert import logs"
ON public.finance_import_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role IN ('admin', 'financeiro', 'rtv')
  )
);

-- finance_import_logs: permitir update
CREATE POLICY "Authenticated users can update import logs"
ON public.finance_import_logs
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role IN ('admin', 'financeiro', 'rtv')
  )
);

-- finance_events: permitir insert
CREATE POLICY "Authenticated users can insert events"
ON public.finance_events
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role IN ('admin', 'financeiro', 'rtv')
  )
);

-- finance_events: permitir update
CREATE POLICY "Authenticated users can update events"
ON public.finance_events
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role IN ('admin', 'financeiro', 'rtv')
  )
);