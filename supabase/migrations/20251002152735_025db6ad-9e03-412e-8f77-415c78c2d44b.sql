-- Ajustar políticas RLS para tabelas financeiras

-- finance_import_logs: permitir insert para admin e financeiro
DROP POLICY IF EXISTS "Admin and finance can insert import logs" ON public.finance_import_logs;
CREATE POLICY "Admin and finance can insert import logs"
ON public.finance_import_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'financeiro', 'rtv')
  )
);

-- finance_events: permitir insert para admin e financeiro
DROP POLICY IF EXISTS "Admin and finance can insert events" ON public.finance_events;
CREATE POLICY "Admin and finance can insert events"
ON public.finance_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'financeiro', 'rtv')
  )
);

-- finance_import_logs: permitir update para admin e financeiro
DROP POLICY IF EXISTS "Admin and finance can update import logs" ON public.finance_import_logs;
CREATE POLICY "Admin and finance can update import logs"
ON public.finance_import_logs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'financeiro', 'rtv')
  )
);

-- finance_events: permitir update para admin e financeiro
DROP POLICY IF EXISTS "Admin and finance can update events" ON public.finance_events;
CREATE POLICY "Admin and finance can update events"
ON public.finance_events
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'financeiro', 'rtv')
  )
);