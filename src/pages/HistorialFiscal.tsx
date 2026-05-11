import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calculator,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNegocio } from "@/hooks/useNegocio";
import { formatMXN, MESES_ES } from "@/lib/fiscal";
import { EmptyState } from "@/components/EmptyState";
import { SpinnerInline } from "@/components/SkeletonCard";
import { handleError } from "@/lib/errors";

/* ─── Tipos ─────────────────────────────────────────────────────── */
interface Calculo {
  id: string;
  isr: number;
  iva: number;
  fecha: string;
}

interface MesData {
  key: string; // YYYY-MM
  mes: number;
  anio: number;
  ingresos: number;
  gastos: number;
  tickets: number;
  calculos: Calculo[];
}

/* ─── Tarjeta de cálculo eliminable ─────────────────────────────── */
function FilaCalculo({
  calculo,
  onDelete,
}: {
  calculo: Calculo;
  onDelete: (id: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pedir = () => {
    setConfirming(true);
    timerRef.current = setTimeout(() => setConfirming(false), 3000);
  };
  const confirmar = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await onDelete(calculo.id);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">
          ISR {formatMXN(calculo.isr)}
        </span>
        {" · "}
        <span className="font-semibold text-foreground">
          IVA {formatMXN(calculo.iva)}
        </span>
        <br />
        <span>
          Guardado el{" "}
          {new Date(calculo.fecha).toLocaleDateString("es-MX", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      {confirming ? (
        <button
          onClick={confirmar}
          className="rounded-xl bg-destructive px-3 py-1.5 text-xs font-bold text-white transition-colors"
        >
          ¿Eliminar?
        </button>
      ) : (
        <button
          onClick={pedir}
          className="rounded-xl p-2 hover:bg-destructive/10 transition-colors"
          title="Eliminar cálculo"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      )}
    </div>
  );
}

/* ─── Página ─────────────────────────────────────────────────────── */
export default function HistorialFiscal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { negocio } = useNegocio();
  const [meses, setMeses] = useState<MesData[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    if (!user || !negocio) return;
    setLoading(true);
    const desde = new Date();
    desde.setMonth(desde.getMonth() - 11);
    const desdeStr = `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, "0")}-01`;

    try {
      const [{ data: txs }, { data: calcs }] = await Promise.all([
        supabase
          .from("transacciones")
          .select("tipo, monto, fecha")
          .eq("negocio_id", negocio.id)
          .gte("fecha", desdeStr),
        supabase
          .from("calculos_fiscales")
          .select("id, periodo, isr_estimado, iva_estimado, fecha_calculo")
          .eq("usuario_id", user.id)
          .order("fecha_calculo", { ascending: false }),
      ]);

      const map = new Map<string, MesData>();
      const ensure = (key: string): MesData => {
        let m = map.get(key);
        if (!m) {
          const [a, mm] = key.split("-").map(Number);
          m = { key, mes: mm, anio: a, ingresos: 0, gastos: 0, tickets: 0, calculos: [] };
          map.set(key, m);
        }
        return m;
      };

      (txs ?? []).forEach((t: any) => {
        const key = t.fecha.slice(0, 7);
        const m = ensure(key);
        if (t.tipo === "INGRESO") m.ingresos += Number(t.monto);
        else m.gastos += Number(t.monto);
      });

      (calcs ?? []).forEach((c: any) => {
        const m = ensure(c.periodo);
        m.calculos.push({
          id: c.id,
          isr: Number(c.isr_estimado),
          iva: Number(c.iva_estimado),
          fecha: c.fecha_calculo,
        });
      });

      // Contar tickets por mes
      try {
        for (let i = 0; i < 12; i++) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const folder = `${user.id}/${key}`;
          const { data } = await supabase.storage.from("tickets").list(folder, { limit: 100 });
          const count = (data ?? []).filter((f) => f.name && !f.name.startsWith(".")).length;
          if (count > 0) {
            const m = ensure(key);
            m.tickets = count;
          }
        }
      } catch {
        // silencioso
      }

      const arr = Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
      setMeses(arr);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, negocio]);

  const eliminarCalculo = async (calculoId: string) => {
    try {
      const { error } = await supabase
        .from("calculos_fiscales")
        .delete()
        .eq("id", calculoId);
      if (error) throw error;
      setMeses((prev) =>
        prev
          .map((m) => ({
            ...m,
            calculos: m.calculos.filter((c) => c.id !== calculoId),
          }))
          .filter(
            (m) =>
              m.calculos.length > 0 ||
              m.ingresos > 0 ||
              m.gastos > 0 ||
              m.tickets > 0
          )
      );
      toast.success("🗑️ Cálculo eliminado");
    } catch (err) {
      handleError(err);
    }
  };

  /* navegar a Declaracion pre-llenando el mes/año */
  const declararMes = (m: MesData) => {
    navigate(`/declarar?mes=${m.mes}&anio=${m.anio}`);
  };

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
          Aquí puedes ver, mes por mes, lo que has registrado. Puedes eliminar
          cálculos guardados o volver a declarar cualquier mes.
        </p>
      </div>

      {loading ? (
        <SpinnerInline label="Armando tu historial…" />
      ) : meses.length === 0 ? (
        <EmptyState
          emoji="📭"
          title="Aún no hay nada que mostrar"
          description="Cuando registres ventas, gastos o cálculos, aparecerán aquí."
        />
      ) : (
        <div className="space-y-4">
          {meses.map((m) => {
            const utilidad = m.ingresos - m.gastos;
            const ultimoCalculo = m.calculos[0];

            return (
              <div
                key={m.key}
                className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm"
              >
                {/* Cabecera del mes */}
                <div className="flex items-center justify-between bg-muted px-4 py-3">
                  <p className="font-extrabold">
                    {MESES_ES[m.mes - 1]} {m.anio}
                  </p>
                  {/* botón re-declarar */}
                  <button
                    onClick={() => declararMes(m)}
                    className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                    title="Volver a calcular este mes"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Recalcular
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {/* Ingresos / Gastos */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                        Vendiste
                      </p>
                      <p className="font-extrabold text-green-700 dark:text-green-400">
                        {formatMXN(m.ingresos)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-3">
                      <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                        Gastaste
                      </p>
                      <p className="font-extrabold text-rose-700 dark:text-rose-400">
                        {formatMXN(m.gastos)}
                      </p>
                    </div>
                  </div>

                  {/* Utilidad */}
                  {(m.ingresos > 0 || m.gastos > 0) && (
                    <div
                      className={`rounded-xl px-4 py-2.5 flex justify-between items-center text-sm ${
                        utilidad >= 0
                          ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                          : "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300"
                      }`}
                    >
                      <span className="font-semibold">
                        {utilidad >= 0 ? "💚 Ganancia neta" : "🔴 Pérdida neta"}
                      </span>
                      <span className="font-extrabold">{formatMXN(Math.abs(utilidad))}</span>
                    </div>
                  )}

                  {/* Tickets */}
                  {m.tickets > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                      <span>
                        {m.tickets} ticket{m.tickets !== 1 ? "s" : ""} guardado
                        {m.tickets !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {/* Cálculos guardados */}
                  {m.calculos.length > 0 && (
                    <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-extrabold text-primary">
                        <Calculator className="h-4 w-4" /> Cálculos guardados
                      </div>

                      <div className="space-y-2">
                        {m.calculos.map((c) => (
                          <FilaCalculo
                            key={c.id}
                            calculo={c}
                            onDelete={eliminarCalculo}
                          />
                        ))}
                      </div>

                      {/* Último total a pagar */}
                      {ultimoCalculo && (
                        <div className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary flex justify-between">
                          <span>Total estimado a pagar (último cálculo)</span>
                          <span>{formatMXN(ultimoCalculo.isr + ultimoCalculo.iva)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sin actividad */}
                  {m.tickets === 0 &&
                    m.calculos.length === 0 &&
                    m.ingresos === 0 &&
                    m.gastos === 0 && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Sin actividad este mes.
                      </p>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
