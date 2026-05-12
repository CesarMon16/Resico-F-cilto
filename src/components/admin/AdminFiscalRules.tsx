import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SpinnerInline } from "@/components/SkeletonCard";
import { Settings2, Save, Percent, DollarSign } from "lucide-react";

export function AdminFiscalRules() {
  const [iva, setIva] = useState<string>("16");
  const [limite, setLimite] = useState<string>("3500000");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      const { data, error } = await supabase
        .from("configuracion_sistema")
        .select("*")
        .eq("id", 1)
        .single();

      // Si la tabla no existe aún (404 / PGRST116), usamos valores por defecto
      if (data) {
        setIva(String(Number(data.iva_rate) * 100));
        setLimite(String(data.limite_anual_resico));
      }
      // Si hay error lo ignoramos y dejamos los defaults (16% / 3,500,000)
      setLoading(false);
    }
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase
        .from("configuracion_sistema")
        .update({
          iva_rate: parseFloat(iva) / 100,
          limite_anual_resico: parseFloat(limite),
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      if (error) throw error;
      toast.success("Reglas fiscales actualizadas correctamente");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error("Error al guardar: " + msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="py-10 text-center"><SpinnerInline /></div>;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Settings2 className="h-5 w-5" />
          </div>
          <h2 className="font-extrabold text-lg">Configuración de Reglas</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold mb-2 block">Tasa de IVA General (%)</label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="number"
                  step="0.1"
                  value={iva}
                  onChange={(e) => setIva(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2.5 text-sm outline-none ring-ring focus:ring-2"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 px-1">
                Este valor se usará para desglosar el IVA en todos los cálculos de los usuarios.
              </p>
            </div>

            <div>
              <label className="text-sm font-bold mb-2 block">Tope Anual RESICO ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="number"
                  value={limite}
                  onChange={(e) => setLimite(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2.5 text-sm outline-none ring-ring focus:ring-2"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 px-1">
                Monto máximo de ingresos permitidos para el régimen RESICO.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary p-4 text-primary-foreground font-bold shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? <SpinnerInline /> : <Save className="h-5 w-5" />}
            Guardar cambios
          </button>
        </form>
      </div>
      
      <div className="rounded-2xl bg-warning/10 p-4 text-xs text-warning-foreground border border-warning/20">
        <p className="font-bold">⚠️ Nota importante:</p>
        <p className="mt-1">
          Cualquier cambio aquí afectará inmediatamente los cálculos de impuestos de todos los usuarios de la plataforma. Úsalo con precaución.
        </p>
      </div>
    </div>
  );
}
