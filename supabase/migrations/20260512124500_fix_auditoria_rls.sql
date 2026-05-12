-- Habilitar inserción en la tabla de auditoría
-- Todos los usuarios autenticados deben poder registrar sus acciones por seguridad.
CREATE POLICY "Usuarios registran su propia actividad" ON public.auditoria
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Asegurar que el admin pueda ver toda la auditoría (actualizar política existente)
DROP POLICY IF EXISTS "Usuarios ven su auditoria" ON public.auditoria;
CREATE POLICY "Aislamiento auditoría: usuarios ven lo suyo, admin ve todo" ON public.auditoria
  FOR SELECT USING (auth.uid() = usuario_id OR public.has_role(auth.uid(), 'ADMIN'));
