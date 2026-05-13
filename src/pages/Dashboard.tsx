import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { SummaryCard } from "@/components/SummaryCard";
import { QuickActionCard } from "@/components/QuickActionCard";
import { TransactionItem, Transaction } from "@/components/TransactionItem";
import { Avisos } from "@/components/dashboard/Avisos";
import { SaludFinanciera } from "@/components/dashboard/SaludFinanciera";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNegocio } from "@/hooks/useNegocio";
import { calcularResumen, formatMXN, MESES_ES, type Movimiento } from "@/lib/fiscal";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import type { Tables } from "@/integrations/supabase/types";

function saludo() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

const HOY = new Date();

export default function Dashboard() {
  const { user } = useAuth();
  const { negocio, loading: negocioLoading } = useNegocio();
  const { permission, subscribe } = usePushNotifications();
  const [nombre, setNombre] = useState("");
  const [movs, setMovs] = useState<Tables<"transacciones">[]>([]);
  const [anio, setAnio] = useState(HOY.getFullYear());

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("nombre").eq("id", user.id).maybeSingle()
      .then(({ data }) => data && setNombre(data.nombre));
  }, [user]);

  useEffect(() => {
    if (!negocio) return;
    (async () => {
      const { data } = await supabase
        .from("transacciones")
        .select("id, tipo, monto, descripcion, fecha, con_factura")
        .eq("negocio_id", negocio.id)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      setMovs(data ?? []);
    })();
  }, [negocio]);

  const [mes, setMes] = useState<number | "all">(HOY.getMonth() + 1); // 1-12 o "all"

  const { recientes, resumen } = useMemo(() => {
    const inicioAnio = `${anio}-01-01`;
    const finAnio = `${anio}-12-31`;
    let delPeriodo = movs.filter((m) => m.fecha >= inicioAnio && m.fecha <= finAnio);

    // Filtrar por mes si no es "Año completo"
    if (mes !== "all") {
      const mesStr = String(mes).padStart(2, "0");
      delPeriodo = delPeriodo.filter((m) => m.fecha.startsWith(`${anio}-${mesStr}`));
    }

    const resumen = calcularResumen(delPeriodo);
    const recientes: Transaction[] = delPeriodo.slice(0, 6).map((t) => ({
      id: t.id,
      tipo: t.tipo,
      monto: Number(t.monto),
      descripcion: t.descripcion ?? "",
      fecha: new Date(t.fecha + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
    }));
    return { recientes, resumen };
  }, [movs, anio, mes]);

  if (!negocioLoading && !negocio) return <Navigate to="/preparar-negocio" replace />;

  const periodoLabel = mes === "all"
    ? `Año ${anio}`
    : `${MESES_ES[mes - 1]} ${anio}`;

  // Solo años pasados + año actual (sin futuros)
  const anios = Array.from({ length: 4 }, (_, i) => HOY.getFullYear() - 3 + i);

  // Si el año seleccionado es el actual, solo mostrar meses hasta el mes actual
  const mesMaximo = anio === HOY.getFullYear() ? HOY.getMonth() + 1 : 12;
  const mesesOpciones = [
    { value: "all" as const, label: "Año completo" },
    ...MESES_ES.slice(0, mesMaximo).map((nombre, i) => ({ value: i + 1, label: nombre })),
  ];

  const handleAnioChange = (nuevoAnio: number) => {
    setAnio(nuevoAnio);
    // Si el mes actual supera el máximo del nuevo año, resetear a "Año completo"
    if (nuevoAnio === HOY.getFullYear() && mes !== "all" && (mes as number) > HOY.getMonth() + 1) {
      setMes("all");
    }
  };

  return (
    <div className="px-4 pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{saludo()} 👋</p>
          <h1 className="text-2xl font-extrabold">{nombre || "Bienvenido"}</h1>
        </div>
        <Avisos />
      </div>

      {permission === "default" && (
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/20 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">Activa tus recordatorios</p>
              <p className="text-[10px] text-muted-foreground">Te avisaremos antes de tu declaración.</p>
            </div>
          </div>
          <button 
            onClick={subscribe}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm active:scale-95"
          >
            Activar
          </button>
        </div>
      )}

      {resumen && <SaludFinanciera resumen={resumen} />}

      <Link
        to="/declaracion"
        className="flex items-center justify-between rounded-2xl bg-primary p-4 text-primary-foreground shadow-md active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6" />
          <div>
            <p className="font-extrabold">Revisar mi declaración</p>
            <p className="text-xs opacity-80">Te guío paso a paso</p>
          </div>
        </div>
        <span>›</span>
      </Link>

      {/* ── Filtros Mes / Año ── */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ver periodo</p>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={String(mes)}
            onChange={(e) => setMes(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="rounded-xl border border-input bg-card p-3 font-semibold text-sm outline-none focus:ring-2 ring-ring"
          >
            {mesesOpciones.map((m) => (
              <option key={String(m.value)} value={String(m.value)}>{m.label}</option>
            ))}
          </select>
          <select
            value={anio}
            onChange={(e) => handleAnioChange(Number(e.target.value))}
            className="rounded-xl border border-input bg-card p-3 font-semibold text-sm outline-none focus:ring-2 ring-ring"
          >
            {anios.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      <SummaryCard ingresos={resumen.ingresosTotal} gastos={resumen.gastosTotal} periodo={periodoLabel} />

      <div>
        <h2 className="mb-3 font-bold text-lg">¿Qué hiciste hoy?</h2>
        <div className="grid grid-cols-2 gap-4">
          <QuickActionCard icon={TrendingUp} label="Hoy vendí" to="/registrar/ingreso" variant="income" />
          <QuickActionCard icon={TrendingDown} label="Hoy compré" to="/registrar/gasto" variant="expense" />
        </div>
      </div>

      {/* Tarjetas fiscales */}
      <div>
        <h2 className="mb-3 font-bold text-lg">Tus impuestos estimados</h2>
        <div className="grid grid-cols-2 gap-3">
          <FiscalCard label="Utilidad" value={resumen.utilidad} tone="primary" />
          <FiscalCard label="Total a pagar" value={resumen.totalImpuestos} tone="warning" />
          <FiscalCard
            label={`ISR RESICO (${(resumen.tasaISR * 100).toFixed(2)}%)`}
            value={resumen.isr}
            tone="default"
          />
          <FiscalCard
            label="IVA a pagar"
            value={resumen.ivaAPagar}
            tone={resumen.ivaAPagar < 0 ? "success" : "default"}
            note={resumen.ivaAPagar < 0 ? "Saldo a favor" : undefined}
          />
          <FiscalCard label="IVA cobrado" value={resumen.ivaCobrado} tone="muted" />
          <FiscalCard label="IVA acreditable" value={resumen.ivaAcreditable} tone="muted" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Cálculo estimado. No sustituye la asesoría de un contador ni la información oficial del SAT.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-bold text-lg">Últimos movimientos</h2>
        <div className="space-y-3">
          {recientes.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              Aún no registras nada en {periodoLabel}.
            </p>
          ) : (
            recientes.map((t) => <TransactionItem key={t.id} {...t} />)
          )}
        </div>
      </div>
    </div>
  );
}

function FiscalCard({
  label,
  value,
  tone = "default",
  note,
}: {
  label: string;
  value: number;
  tone?: "default" | "primary" | "warning" | "success" | "muted";
  note?: string;
}) {
  const toneCls = {
    default: "bg-card",
    primary: "bg-primary/10 border-primary/20",
    warning: "bg-warning-light border-warning/20",
    success: "bg-success-light border-success/20",
    muted: "bg-muted",
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${toneCls}`}>
      <p className="text-xs text-muted-foreground font-semibold">{label}</p>
      <p className="mt-1 text-lg font-extrabold">{formatMXN(value)}</p>
      {note && <p className="text-xs text-success font-semibold mt-0.5">{note}</p>}
    </div>
  );
}
