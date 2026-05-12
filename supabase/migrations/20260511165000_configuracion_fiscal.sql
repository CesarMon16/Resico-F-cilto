-- Migración para almacenar la configuración de Reglas Fiscales

CREATE TABLE IF NOT EXISTS public.configuracion_sistema (
    id INT PRIMARY KEY DEFAULT 1,
    iva_rate NUMERIC(5,4) NOT NULL DEFAULT 0.16,
    limite_anual_resico NUMERIC(12,2) NOT NULL DEFAULT 3500000.00,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertamos la regla inicial (solo debe haber un registro con id = 1)
INSERT INTO public.configuracion_sistema (id, iva_rate, limite_anual_resico)
VALUES (1, 0.16, 3500000.00)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.configuracion_sistema ENABLE ROW LEVEL SECURITY;

-- Todos pueden consultar la configuración (para cálculos)
CREATE POLICY "Lectura pública de configuracion" ON public.configuracion_sistema
    FOR SELECT USING (true);

-- Solo los Administradores pueden modificar la configuración
CREATE POLICY "Admins editan configuracion" ON public.configuracion_sistema
    FOR UPDATE USING (public.has_role(auth.uid(), 'ADMIN'));
