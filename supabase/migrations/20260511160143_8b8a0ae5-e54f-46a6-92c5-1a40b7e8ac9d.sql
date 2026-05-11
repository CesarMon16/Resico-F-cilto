ALTER TABLE public.negocios ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.transacciones ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.calculos_fiscales ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_negocios_tenant_id ON public.negocios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_tenant_id ON public.transacciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calculos_tenant_id ON public.calculos_fiscales(tenant_id);