
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rfc text,
  ADD COLUMN IF NOT EXISTS regimen_fiscal text DEFAULT 'RESICO_PF',
  ADD COLUMN IF NOT EXISTS actividad_economica text,
  ADD COLUMN IF NOT EXISTS correo text,
  ADD COLUMN IF NOT EXISTS domicilio_fiscal text,
  ADD COLUMN IF NOT EXISTS fecha_inicio_operaciones date;

ALTER TABLE public.transacciones
  ADD COLUMN IF NOT EXISTS con_factura boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS contraparte text,
  ADD COLUMN IF NOT EXISTS metodo_pago text;
