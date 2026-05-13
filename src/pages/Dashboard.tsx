import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { SummaryCard } from "@/components/SummaryCard";
import { QuickActionCard } from "@/components/QuickActionCard";
import { TransactionItem, Transaction } from "@/components/TransactionItem";
import { Avisos } from "@/components/dashboard/Avisos";
import { SaludFinanciera } from "@/components/dashboard/SaludFinanciera";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNegocio } from "@/hooks/useNegocio";
import { calcularResumen, formatMXN, MESES_ES } from "@/lib/fiscal";
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
  const [mes, setMes] = useState(HOY.getMonth() + 1);

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
        .limit(1000);
      setMovs(data ?? []);
    })();
  }, [negocio]);

  const { recientes, resumen, anioProgreso } = useMemo(() => {
    const mesStr = String(mes).padStart(2, "0");
    const inicioMes = `${anio}-${mesStr}-01`;
    const finMes = `${anio}-${mesStr}-31`;
    
    const delAnio = movs.filter((m) => m.fecha >= `${anio}-01-01` && m.fecha <= `${anio}-12-31`);
    const delMes = movs.filter((m) => m.fecha >= inicioMes && m.fecha <= finMes);
    
    const resumen = calcularResumen(delMes);
    const ingresosAnuales = delAnio.filter(m => m.tipo === "ingreso").reduce((acc, m) => acc + Number(m.monto), 0);
    
    const recientes: Transaction[] = delMes.slice(0, 5).map((t) => ({
      id: t.id,
      tipo: t.tipo,
      monto: Number(t.monto),
      descripcion: t.descripcion ?? "",
      fecha: new Date(t.fecha + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
    }));
    
    return { 
      recientes, 
      resumen, 
      anioProgreso: {
        monto: ingresosAnuales,
        porcentaje: (ingresosAnuales / 3500000) * 100 // Límite RESICO
      }
    };
  }, [movs, anio, mes]);

  if (!negocioLoading && !negocio) return <Navigate to="/preparar-negocio" replace />;

  const periodoLabel = `${MESES_ES[mes - 1]} ${anio}`;
  const anios = [HOY.getFullYear() - 1, HOY.getFullYear(), HOY.getFullYear() + 1];

  const cambiarMes = (diff: number) => {
    let newMes = mes + diff;
    let newAnio = anio;
    if (newMes > 12) { newMes = 1; newAnio++; }
    if (newMes < 1) { newMes = 12; newAnio--; }
    setMes(newMes);
    setAnio(newAnio);
  };

  return (
    <div className="px-4 pt-6 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{saludo()} 👋</p>
          <h1 className="text-2xl font-extrabold">{nombre || "Bienvenido"}</h1>
        </div>
        <Avisos />
      </div>

      {/* Selector de Periodo Premium */}
      <div className="flex items-center justify-between bg-card rounded-2xl border p-2 shadow-sm">
        <button onClick={() => cambiarMes(-1)} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold capitalize">{MESES_ES[mes-1]}</span>
          <div className="flex items-center gap-1">
            <select 
              value={anio} 
              onChange={(e) => setAnio(Number(e.target.value))}
              className="text-[10px] font-bold text-muted-foreground bg-transparent border-none p-0 h-auto focus:ring-0 appearance-none text-center cursor-pointer"
            >
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown className="h-2 w-2 text-muted-foreground" />
          </div>
        </div>
        <button onClick={() => cambiarMes(1)} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {permission === "default" && (
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/20 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">Activa tus recordatorios</p>
              <p className="text-[10px] text-muted-foreground">Te avisaremos antes de tu declaración.</p>
            </div>
          </div>
          <button onClick={subscribe} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm active:scale-95">Activar</button>
        </div>
      )}

      {resumen && <SaludFinanciera resumen={resumen} />}

      <Link
        to="/declaracion"
        state={{ anio, mes }}
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

      <SummaryCard ingresos={resumen.ingresosTotal} gastos={resumen.gastosTotal} periodo={periodoLabel} />

      <div>
        <h2 className="mb-3 font-bold text-lg">¿Qué hiciste hoy?</h2>
        <div className="grid grid-cols-2 gap-4">
          <QuickActionCard 
            icon={TrendingUp} 
            label="Hoy vendí" 
            to="/registrar/ingreso" 
            variant="income" 
            state={{ defaultAnio: anio, defaultMes: mes }}
          />
          <QuickActionCard 
            icon={TrendingDown} 
            label="Hoy compré" 
            to="/registrar/gasto" 
            variant="expense" 
            state={{ defaultAnio: anio, defaultMes: mes }}
          />
        </div>
      </div>

      {/* Tarjetas fiscales del mes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Impuestos estimados</h2>
          <div className="px-2 py-1 bg-muted rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Periodo mensual</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FiscalCard label="Utilidad" value={resumen.utilidad} tone="primary" />
          <FiscalCard label="Total a pagar" value={resumen.totalImpuestos} tone="warning" />
          <FiscalCard label={`ISR (${(resumen.tasaISR * 100).toFixed(2)}%)`} value={resumen.isr} tone="default" />
          <FiscalCard label="IVA a pagar" value={resumen.ivaAPagar} tone={resumen.ivaAPagar < 0 ? "success" : "default"} note={resumen.ivaAPagar < 0 ? "Saldo a favor" : undefined} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-bold text-lg">Movimientos del periodo</h2>
        <div className="space-y-3">
          {recientes.length === 0 ? (
            <div className="text-center py-10 bg-muted/30 rounded-3xl border border-dashed">
              <Calendar className="h-8 w-8 mx-auto text-muted-foreground opacity-20 mb-2" />
              <p className="text-sm text-muted-foreground">No hay registros en {periodoLabel}</p>
            </div>
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
