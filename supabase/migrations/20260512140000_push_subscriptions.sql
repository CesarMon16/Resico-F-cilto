-- Tabla para almacenar suscripciones a notificaciones push (PWA)
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gestionan sus propias suscripciones" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = usuario_id);

-- Índice para búsquedas por usuario
CREATE INDEX idx_push_subs_usuario ON public.push_subscriptions(usuario_id);
