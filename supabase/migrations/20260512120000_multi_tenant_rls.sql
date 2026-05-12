-- Evolución a Multi-tenant Real
-- Las políticas ahora se basan en la pertenencia al negocio (negocio_id),
-- permitiendo que dueños, empleados o contadores accedan si están vinculados.

-- Función helper para verificar acceso al negocio
CREATE OR REPLACE FUNCTION public.check_business_access(_negocio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.negocios
    WHERE id = _negocio_id AND (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'))
  ) OR EXISTS (
    SELECT 1 FROM public.contador_clientes
    WHERE negocio_id = _negocio_id AND contador_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Actualizar políticas de transacciones
DROP POLICY IF EXISTS "Usuarios ven sus transacciones" ON public.transacciones;
CREATE POLICY "Aislamiento multi-tenant: ver transacciones" ON public.transacciones
  FOR SELECT USING (public.check_business_access(negocio_id));

DROP POLICY IF EXISTS "Usuarios crean transacciones" ON public.transacciones;
CREATE POLICY "Aislamiento multi-tenant: crear transacciones" ON public.transacciones
  FOR INSERT WITH CHECK (public.check_business_access(negocio_id));

DROP POLICY IF EXISTS "Usuarios actualizan sus transacciones" ON public.transacciones;
CREATE POLICY "Aislamiento multi-tenant: actualizar transacciones" ON public.transacciones
  FOR UPDATE USING (public.check_business_access(negocio_id));

DROP POLICY IF EXISTS "Usuarios eliminan sus transacciones" ON public.transacciones;
CREATE POLICY "Aislamiento multi-tenant: eliminar transacciones" ON public.transacciones
  FOR DELETE USING (public.check_business_access(negocio_id));

-- Repetir para documentos
DROP POLICY IF EXISTS "Usuarios ven sus documentos" ON public.documentos;
CREATE POLICY "Aislamiento multi-tenant: ver documentos" ON public.documentos
  FOR SELECT USING (public.check_business_access(negocio_id));

DROP POLICY IF EXISTS "Usuarios suben documentos" ON public.documentos;
CREATE POLICY "Aislamiento multi-tenant: subir documentos" ON public.documentos
  FOR INSERT WITH CHECK (public.check_business_access(negocio_id));

-- Repetir para calculos_fiscales
DROP POLICY IF EXISTS "Usuarios ven sus calculos" ON public.calculos_fiscales;
CREATE POLICY "Aislamiento multi-tenant: ver calculos" ON public.calculos_fiscales
  FOR SELECT USING (public.check_business_access(negocio_id));
