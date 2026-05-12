CREATE OR REPLACE FUNCTION public.buscar_contador_por_correo(_email TEXT)
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE lower(p.correo) = lower(_email)
    AND ur.role = 'CONTADOR'::app_role
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.buscar_contador_por_correo(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buscar_contador_por_correo(TEXT) TO authenticated;