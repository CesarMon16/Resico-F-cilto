-- Añadir columnas de plazo y propósito a la tabla de créditos
ALTER TABLE public.creditos 
ADD COLUMN IF NOT EXISTS plazo INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS proposito TEXT;

-- Comentario para documentación
COMMENT ON COLUMN public.creditos.plazo IS 'Plazo en meses para pagar el crédito';
COMMENT ON COLUMN public.creditos.proposito IS 'Motivo o inversión para la cual se solicita el apoyo';
