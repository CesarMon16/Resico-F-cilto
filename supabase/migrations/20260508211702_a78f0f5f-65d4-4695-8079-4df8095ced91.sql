REVOKE EXECUTE ON FUNCTION public.es_contador_de(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_contador_de(UUID, UUID) TO authenticated;