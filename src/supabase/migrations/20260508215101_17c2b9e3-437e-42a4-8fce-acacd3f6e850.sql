-- Allow users to insert their own audit entries
CREATE POLICY "Usuarios crean su auditoria"
ON public.auditoria
FOR INSERT
WITH CHECK (auth.uid() = usuario_id);