-- Tabla de notificaciones para el sistema SaaS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  leido BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propias notificaciones" ON public.notifications
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios marcan como leídas sus notificaciones" ON public.notifications
  FOR UPDATE USING (auth.uid() = usuario_id);

-- Índices
CREATE INDEX idx_notifications_usuario_leido ON public.notifications(usuario_id, leido);
