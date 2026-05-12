import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Save, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNegocio } from "@/hooks/useNegocio";
import { useResumenMes } from "@/hooks/useResumenMes";
import { explicarISR, explicarIVA, formatMXN, MESES_ES } from "@/lib/fiscal";
import { EmptyState } from "@/components/EmptyState";
import { SpinnerInline } from "@/components/SkeletonCard";
import { guardarCalculoFiscal } from "@/services/fiscal.service";
import { handleError } from "@/lib/errors";

const HOY = new Date();

export default function Declaracion() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { negocio } = useNegocio();
  const [paso, setPaso] = useState(0);
  const [mes, setMes] = useState(HOY.getMonth() + 1);
  const [anio, setAnio] = useState(HOY.getFullYear());
  const [guardando, setGuardando] = useState(false);

  const { movs, resumen, loading } = useResumenMes(mes, anio);
  const periodo = `${MESES_ES[mes - 1]} ${anio}`;
  const ingresos = useMemo(() => movs.filter((m) => m.tipo === "INGRESO"), [movs]);
  const gastos = useMemo(() => movs.filter((m) => m.tipo === "GASTO"), [movs]);

  const guardar = async () => {
    if (!user || !negocio || !resumen) return;
    setGuardando(true);
    try {
      await guardarCalculoFiscal({ usuario_id: user.id, negocio_id: negocio.id, mes, anio, resumen });
      toast.success("Cálculo guardado en tu historial 🎉");
      navigate("/historial-fiscal");
    } catch (err) {
      handleError(err);
    } finally {
      setGuardando(false);
    }
  };

  const Header = (
    <div className="flex items-center justify-between">
      <button
        onClick={() => (paso === 0 ? navigate(-1) : setPaso((p) => p - 1))}
        className="flex items-center gap-2 text-muted-foreground font-semibold"
      >
        <ArrowLeft className="h-5 w-5" /> Atrás
      </button>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-2 w-6 rounded-full ${i <= paso ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="px-4 pt-6 pb-32 space-y-6 animate-slide-up">
      {Header}

      {paso === 0 && (
        <div className="space-y-5">
          <div>
            <p className="text-3xl">👋</p>
            <h1 className="text-2xl font-extrabold mt-2">Vamos a revisar tus impuestos</h1>
            <p className="text-muted-foreground mt-1">
              Te haré un par de preguntas y te diré, en simple, cuánto te tocaría pagar.
            </p>
          </div>
          <label className="block">
            <p className="font-bold mb-2">¿Qué mes quieres revisar?</p>
            <div className="flex gap-2">
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="flex-1 rounded-xl border border-input bg-card p-4 text-base font-semibold outline-none focus:ring-2 ring-ring"
              >
                {MESES_ES.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className="rounded-xl border border-input bg-card p-4 text-base font-semibold outline-none focus:ring-2 ring-ring"
              >
                {[HOY.getFullYear() - 1, HOY.getFullYear()].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </label>
          <button
            onClick={() => setPaso(1)}
            className="w-full rounded-2xl bg-primary p-4 text-primary-foreground font-bold text-base flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            Empezar <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {paso === 1 && (
        <div className="space-y-5">
          <div>
            <div className="rounded-full bg-success-light w-12 h-12 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <h1 className="text-2xl font-extrabold mt-3">Esto vendiste en {periodo}</h1>
          </div>
          {loading ? <SpinnerInline /> : ingresos.length === 0 ? (
            <EmptyState emoji="💸" title="No registraste ventas" description={`No encontramos ventas en ${periodo}.`} />
          ) : (
            <div className="rounded-2xl bg-success-light border border-success/20 p-5">
              <p className="text-sm font-semibold text-foreground/70">Total cobrado</p>
              <p className="text-3xl font-extrabold text-success">{formatMXN(resumen?.ingresosTotal ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-2">{ingresos.length} venta{ingresos.length !== 1 ? "s" : ""} registrada{ingresos.length !== 1 ? "s" : ""}.</p>
            </div>
          )}
          <button
            onClick={() => setPaso(2)}
            className="w-full rounded-2xl bg-primary p-4 text-primary-foreground font-bold text-base flex items-center justify-center gap-2"
          >
            Sí, está bien <Check className="h-5 w-5" />
          </button>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-5">
          <div>
            <div className="rounded-full bg-destructive/10 w-12 h-12 flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-2xl font-extrabold mt-3">Esto compraste en {periodo}</h1>
            <p className="text-muted-foreground mt-1">Solo cuentan las compras con factura para reducir tu IVA.</p>
          </div>
          {loading ? <SpinnerInline /> : gastos.length === 0 ? (
            <EmptyState emoji="🧾" title="Sin gastos registrados" description={`No encontramos compras en ${periodo}.`} />
          ) : (
            <div className="rounded-2xl bg-card border border-border p-5">
              <p className="text-sm font-semibold text-foreground/70">Total gastado</p>
              <p className="text-3xl font-extrabold">{formatMXN(resumen?.gastosTotal ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {gastos.length} compra{gastos.length !== 1 ? "s" : ""} · IVA con factura: {formatMXN(resumen?.ivaAcreditable ?? 0)}
              </p>
            </div>
          )}
          <button
            onClick={() => setPaso(3)}
            className="w-full rounded-2xl bg-primary p-4 text-primary-foreground font-bold text-base flex items-center justify-center gap-2"
          >
            Continuar <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {paso === 3 && resumen && (
        <div className="space-y-5">
          <div>
            <div className="rounded-full bg-primary/15 w-12 h-12 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold mt-3">Esto es lo que probablemente tendrás que pagar</h1>
            <p className="text-muted-foreground mt-1">Cálculo estimado para {periodo}.</p>
          </div>

          <div className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-lg">
            <p className="text-sm opacity-80">Total estimado a pagar</p>
            <p className="text-4xl font-extrabold mt-1">{formatMXN(resumen.totalImpuestos)}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="opacity-80 text-xs">Impuesto sobre tus ventas (ISR)</p>
                <p className="font-bold">{formatMXN(resumen.isr)}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="opacity-80 text-xs">IVA por pagar</p>
                <p className="font-bold">{formatMXN(Math.max(resumen.ivaAPagar, 0))}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
            <p className="text-sm">💡 {explicarISR(resumen)}</p>
            <p className="text-sm">💡 {explicarIVA(resumen)}</p>
          </div>

          <button
            onClick={guardar}
            disabled={guardando}
            className="w-full rounded-2xl bg-primary p-4 text-primary-foreground font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {guardando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Guardar este cálculo
          </button>
          <p className="text-xs text-center text-muted-foreground">
            Estimación informativa. No sustituye la asesoría de un contador.
          </p>
        </div>
      )}
    </div>
  );
}
