-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('USUARIO', 'CONTADOR', 'ADMIN');
CREATE TYPE public.tipo_transaccion AS ENUM ('INGRESO', 'GASTO');
CREATE TYPE public.estatus_credito AS ENUM ('SOLICITADO', 'EN_REVISION', 'APROBADO', 'RECHAZADO', 'PAGADO');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  telefono TEXT,
  curp TEXT,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ NEGOCIOS ============
CREATE TABLE public.negocios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_negocio TEXT NOT NULL,
  giro TEXT,
  ubicacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.negocios ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_negocios_usuario ON public.negocios(usuario_id);

-- ============ TRANSACCIONES ============
CREATE TABLE public.transacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo public.tipo_transaccion NOT NULL,
  monto NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  descripcion TEXT,
  origen TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transacciones ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_transacciones_negocio ON public.transacciones(negocio_id);
CREATE INDEX idx_transacciones_usuario_fecha ON public.transacciones(usuario_id, fecha DESC);

-- ============ DOCUMENTOS ============
CREATE TABLE public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  url TEXT NOT NULL,
  fecha_subida TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_documentos_negocio ON public.documentos(negocio_id);

-- ============ CALCULOS FISCALES ============
CREATE TABLE public.calculos_fiscales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  ingresos NUMERIC(12,2) NOT NULL DEFAULT 0,
  gastos NUMERIC(12,2) NOT NULL DEFAULT 0,
  isr_estimado NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva_estimado NUMERIC(12,2) NOT NULL DEFAULT 0,
  fecha_calculo TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.calculos_fiscales ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_calculos_negocio_periodo ON public.calculos_fiscales(negocio_id, periodo);

-- ============ CREDITOS ============
CREATE TABLE public.creditos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monto_solicitado NUMERIC(12,2) NOT NULL CHECK (monto_solicitado > 0),
  estatus public.estatus_credito NOT NULL DEFAULT 'SOLICITADO',
  fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.creditos ENABLE ROW LEVEL SECURITY;

-- ============ AUDITORIA ============
CREATE TABLE public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accion TEXT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_auditoria_usuario_fecha ON public.auditoria(usuario_id, fecha DESC);

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Usuarios ven su propio perfil" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Usuarios actualizan su propio perfil" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "Usuarios crean su propio perfil" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "Usuarios ven sus propios roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Solo admins gestionan roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- negocios
CREATE POLICY "Usuarios ven sus negocios" ON public.negocios FOR SELECT
  USING (auth.uid() = usuario_id OR public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Usuarios crean sus negocios" ON public.negocios FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Usuarios actualizan sus negocios" ON public.negocios FOR UPDATE
  USING (auth.uid() = usuario_id);
CREATE POLICY "Usuarios eliminan sus negocios" ON public.negocios FOR DELETE
  USING (auth.uid() = usuario_id);

-- transacciones
CREATE POLICY "Usuarios ven sus transacciones" ON public.transacciones FOR SELECT
  USING (auth.uid() = usuario_id OR public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Usuarios crean transacciones" ON public.transacciones FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Usuarios actualizan sus transacciones" ON public.transacciones FOR UPDATE
  USING (auth.uid() = usuario_id);
CREATE POLICY "Usuarios eliminan sus transacciones" ON public.transacciones FOR DELETE
  USING (auth.uid() = usuario_id);

-- documentos
CREATE POLICY "Usuarios ven sus documentos" ON public.documentos FOR SELECT
  USING (auth.uid() = usuario_id OR public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Usuarios suben documentos" ON public.documentos FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Usuarios eliminan sus documentos" ON public.documentos FOR DELETE
  USING (auth.uid() = usuario_id);

-- calculos_fiscales
CREATE POLICY "Usuarios ven sus calculos" ON public.calculos_fiscales FOR SELECT
  USING (auth.uid() = usuario_id OR public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Usuarios crean calculos" ON public.calculos_fiscales FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- creditos
CREATE POLICY "Usuarios ven sus creditos" ON public.creditos FOR SELECT
  USING (auth.uid() = usuario_id OR public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Usuarios solicitan creditos" ON public.creditos FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- auditoria
CREATE POLICY "Usuarios ven su auditoria" ON public.auditoria FOR SELECT
  USING (auth.uid() = usuario_id OR public.has_role(auth.uid(), 'ADMIN'));

-- ============ TRIGGERS ============

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_negocios_updated BEFORE UPDATE ON public.negocios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, telefono)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'telefono'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'USUARIO');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();