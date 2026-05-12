-- Tabla para asignar clientes a contadores
CREATE TABLE public.contador_clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contador_id UUID NOT NULL,
  cliente_id UUID NOT NULL,
  invitado_por UUID,
  estatus TEXT NOT NULL DEFAULT 'ACTIVO',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (contador_id, cliente_id)
);

CREATE INDEX idx_contador_clientes_contador ON public.contador_clientes(contador_id);
CREATE INDEX idx_contador_clientes_cliente ON public.contador_clientes(cliente_id);

ALTER TABLE public.contador_clientes ENABLE ROW LEVEL SECURITY;

-- Función helper para verificar relación contador-cliente sin recursión
CREATE OR REPLACE FUNCTION public.es_contador_de(_contador UUID, _cliente UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contador_clientes
    WHERE contador_id = _contador
      AND cliente_id = _cliente
      AND estatus = 'ACTIVO'
  )
$$;

-- Políticas para contador_clientes
CREATE POLICY "Contador ve sus asignaciones"
ON public.contador_clientes FOR SELECT
USING (auth.uid() = contador_id OR auth.uid() = cliente_id OR has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Cliente se asigna a un contador"
ON public.contador_clientes FOR INSERT
WITH CHECK (auth.uid() = cliente_id OR has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Cliente o contador desasigna"
ON public.contador_clientes FOR DELETE
USING (auth.uid() = contador_id OR auth.uid() = cliente_id OR has_role(auth.uid(), 'ADMIN'::app_role));

-- Extender RLS de tablas para que contador pueda leer datos de sus clientes
CREATE POLICY "Contador ve transacciones de sus clientes"
ON public.transacciones FOR SELECT
USING (public.es_contador_de(auth.uid(), usuario_id));

CREATE POLICY "Contador ve negocios de sus clientes"
ON public.negocios FOR SELECT
USING (public.es_contador_de(auth.uid(), usuario_id));

CREATE POLICY "Contador ve calculos de sus clientes"
ON public.calculos_fiscales FOR SELECT
USING (public.es_contador_de(auth.uid(), usuario_id));

CREATE POLICY "Contador ve perfil de sus clientes"
ON public.profiles FOR SELECT
USING (public.es_contador_de(auth.uid(), id));