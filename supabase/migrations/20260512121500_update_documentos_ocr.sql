-- Evolución de transacciones para motor fiscal
ALTER TABLE public.transacciones
ADD COLUMN IF NOT EXISTS con_factura BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS metodo_pago TEXT;

-- Índices para mejorar la búsqueda
CREATE INDEX IF NOT EXISTS idx_transacciones_con_factura ON public.transacciones(con_factura);
