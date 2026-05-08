-- Columnas de onboarding en profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS despacho text,
  ADD COLUMN IF NOT EXISTS ciudad text,
  ADD COLUMN IF NOT EXISTS experiencia_anios integer,
  ADD COLUMN IF NOT EXISTS onboarding_completo boolean NOT NULL DEFAULT false;

-- Trigger handle_new_user: dejar de asignar rol por defecto (se elegirá en /elegir-rol)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nombre, telefono, correo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'telefono',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Asegurar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para asignar rol inicial de forma segura (USUARIO o CONTADOR, sólo si no tiene rol)
CREATE OR REPLACE FUNCTION public.asignar_rol_inicial(_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'no autenticado';
  END IF;
  IF _role NOT IN ('USUARIO'::app_role, 'CONTADOR'::app_role) THEN
    RAISE EXCEPTION 'rol no permitido';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid) THEN
    RAISE EXCEPTION 'ya tienes un rol asignado';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role);
END;
$$;