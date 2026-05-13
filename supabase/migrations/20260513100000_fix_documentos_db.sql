-- Migración para corregir restricciones y políticas de la tabla documentos

-- 0. Asegurar que la función de acceso al negocio existe (necesaria para las políticas)
CREATE OR REPLACE FUNCTION public.check_business_access(_negocio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Si el ID es nulo, no hay acceso por negocio (pero la política puede permitirlo por usuario_id)
  IF _negocio_id IS NULL THEN RETURN FALSE; END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.negocios
    WHERE id = _negocio_id AND (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'))
  ) OR EXISTS (
    SELECT 1 FROM public.contador_clientes
    WHERE negocio_id = _negocio_id AND contador_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 1. Hacer que negocio_id sea opcional (muchos documentos fiscales son del perfil, no del negocio)
ALTER TABLE public.documentos ALTER COLUMN negocio_id DROP NOT NULL;

-- 2. Añadir un índice único para permitir el UPSERT por tipo de documento por usuario
-- Esto evita duplicados y permite que el sistema actualice el archivo si se sube de nuevo.
ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_usuario_id_tipo_key;
ALTER TABLE public.documentos ADD CONSTRAINT documentos_usuario_id_tipo_key UNIQUE (usuario_id, tipo);

-- 3. Actualizar políticas de RLS para permitir acceso aunque negocio_id sea NULL
-- Las políticas anteriores dependían de check_business_access(negocio_id), que fallaba si era NULL.
DROP POLICY IF EXISTS "Aislamiento multi-tenant: ver documentos" ON public.documentos;
CREATE POLICY "Documentos: ver propios o por negocio" ON public.documentos
  FOR SELECT USING (auth.uid() = usuario_id OR public.check_business_access(negocio_id));

DROP POLICY IF EXISTS "Aislamiento multi-tenant: subir documentos" ON public.documentos;
CREATE POLICY "Documentos: subir propios" ON public.documentos
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Aislamiento multi-tenant: actualizar documentos" ON public.documentos;
CREATE POLICY "Documentos: actualizar propios" ON public.documentos
  FOR UPDATE USING (auth.uid() = usuario_id);

-- 4. Habilitar tiempo real para la tabla documentos
BEGIN;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'documentos'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.documentos;
    END IF;
  END $$;
COMMIT;
