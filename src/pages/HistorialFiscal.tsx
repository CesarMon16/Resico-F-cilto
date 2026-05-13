import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, FileText, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNegocio } from "@/hooks/useNegocio";
import { formatMXN, MESES_ES } from "@/lib/fiscal";
import { EmptyState } from "@/components/EmptyState";
import { SpinnerInline } from "@/components/SkeletonCard";

interface MesData {
  key: string; // YYYY-MM
  mes: number;
  anio: number;
  ingresos: number;
  gastos: number;
  calculos: { isr: number; iva: number; fecha: string }[];
}

export default function HistorialFiscal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { negocio } = useNegocio();
  const [meses, setMeses] = useState<MesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !negocio) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const desde = new Date();
      desde.setMonth(desde.getMonth() - 11);
      const desdeStr = `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, "0")}-01`;

      const [{ data: txs }, { data: calcs }] = await Promise.all([
        supabase
          .from("transacciones")
          .select("tipo, monto, fecha")
          .eq("negocio_id", negocio.id)
          .gte("fecha", desdeStr),
        supabase
          .from("calculos_fiscales")
          .select("periodo, isr_estimado, iva_estimado, fecha_calculo")
          .eq("usuario_id", user.id)
          .order("fecha_calculo", { ascending: false }),
      ]);

      // Tickets de los últimos 12 meses
      const map = new Map<string, MesData>();
      const ensure = (key: string): MesData => {
        let m = map.get(key);
        if (!m) {
          const [a, mm] = key.split("-").map(Number);
          m = { key, mes: mm, anio: a, ingresos: 0, gastos: 0, calculos: [] };
          map.set(key, m);
        }
        return m;
      };

      (txs ?? []).forEach((t: { tipo: string; monto: number | string; fecha: string }) => {
        const key = t.fecha.slice(0, 7);
        const m = ensure(key);
        if (t.tipo === "INGRESO") m.ingresos += Number(t.monto);
        else m.gastos += Number(t.monto);
      });
      (calcs ?? []).forEach((c: { periodo: string; isr_estimado: number | string; iva_estimado: number | string; fecha_calculo: string }) => {
        const m = ensure(c.periodo);
        m.calculos.push({ isr: Number(c.isr_estimado), iva: Number(c.iva_estimado), fecha: c.fecha_calculo });
      });


      const arr = Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
      if (!cancel) {
        setMeses(arr);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [user, negocio]);

  return (
    <div className="px-4 pt-6 pb-32 space-y-5 animate-slide-up">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground font-semibold"
      >
        <ArrowLeft className="h-5 w-5" /> Regresar
      </button>

      <div>
        <h1 className="text-2xl font-extrabold">📚 Mi historial fiscal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aquí puedes ver, mes por mes, lo que has registrado en tu actividad.
        </p>
      </div>

      {loading ? (
        <SpinnerInline label="Armando tu historial..." />
      ) : meses.length === 0 ? (
        <EmptyState
          emoji="📭"
          title="Aún no hay nada que mostrar"
          description="Cuando registres ventas, gastos o cálculos, aparecerán aquí."
        />
      ) : (
        <div className="space-y-4">
          {meses.map((m) => (
            <div key={m.key} className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="bg-muted px-4 py-2.5">
                <p className="font-extrabold">{MESES_ES[m.mes - 1]} {m.anio}</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-success-light p-3">
                    <p className="text-xs text-muted-foreground font-semibold">Vendiste</p>
                    <p className="font-extrabold text-success">{formatMXN(m.ingresos)}</p>
                  </div>
                  <div className="rounded-xl bg-destructive/10 p-3">
                    <p className="text-xs text-muted-foreground font-semibold">Gastaste</p>
                    <p className="font-extrabold text-destructive">{formatMXN(m.gastos)}</p>
                  </div>
                </div>


                {m.calculos.length > 0 && (
                  <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Calculator className="h-4 w-4" /> Cálculos guardados
                    </div>
                    {m.calculos.map((c, i) => (
                      <div key={i} className="text-xs text-muted-foreground flex justify-between">
                        <span>ISR {formatMXN(c.isr)} · IVA {formatMXN(c.iva)}</span>
                        <span>{new Date(c.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span>
                      </div>
                    ))}
                  </div>
                )}

                {m.calculos.length === 0 && m.ingresos === 0 && m.gastos === 0 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Sin actividad este mes.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
