-- Estructura preparada para la fase futura de "Pagos y Servicios"
-- Requerimiento del prompt: "8. Pagos y servicios (fase futura) - Estructura preparada (no funcional en MVP)"

-- 1. Tabla de Suscripciones
CREATE TYPE public.suscripcion_estatus AS ENUM ('ACTIVA', 'CANCELADA', 'VENCIDA', 'PRUEBA');

CREATE TABLE IF NOT EXISTS public.suscripciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_nombre VARCHAR(255) NOT NULL,
    precio NUMERIC(10, 2) NOT NULL,
    estatus public.suscripcion_estatus DEFAULT 'PRUEBA'::public.suscripcion_estatus,
    fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_fin TIMESTAMP WITH TIME ZONE,
    pasarela_suscripcion_id VARCHAR(255), -- Para guardar el ID de Stripe, PayPal, Conekta, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Historial de Pagos
CREATE TYPE public.pago_estatus AS ENUM ('PENDIENTE', 'COMPLETADO', 'FALLIDO', 'REEMBOLSADO');

CREATE TABLE IF NOT EXISTS public.historial_pagos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    suscripcion_id UUID REFERENCES public.suscripciones(id) ON DELETE SET NULL,
    monto NUMERIC(10, 2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'MXN',
    estatus public.pago_estatus DEFAULT 'PENDIENTE'::public.pago_estatus,
    pasarela_pago_id VARCHAR(255), -- ID de transacción en la pasarela
    metodo_pago VARCHAR(50), -- ej. 'TARJETA', 'TRANSFERENCIA', 'OXXO'
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Seguridad RLS
ALTER TABLE public.suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_pagos ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver sus propias suscripciones y pagos
CREATE POLICY "Usuarios pueden ver sus suscripciones" ON public.suscripciones
    FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "Usuarios pueden ver sus pagos" ON public.historial_pagos
    FOR SELECT USING (usuario_id = auth.uid());

-- Los administradores pueden ver y gestionar todo
CREATE POLICY "Admins pueden gestionar suscripciones" ON public.suscripciones
    FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admins pueden gestionar pagos" ON public.historial_pagos
    FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));
