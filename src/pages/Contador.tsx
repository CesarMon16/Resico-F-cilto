import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Users, TrendingUp, ChevronRight, Clock, AlertCircle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { calcularResumen, formatMXN, MESES_ES, type Movimiento } from "@/lib/fiscal";
import { SpinnerInline, SkeletonCard } from "@/components/SkeletonCard";
import { EmptyState } from "@/components/EmptyState";

type Filtro = "todos" | "activos" | "inactivos" | "alertas";

interface ClienteRow {
  cliente_id: string;
  nombre: string;
  rfc: string | null;
  correo: string | null;
  ingresos: number;
  gastos: number;
  isr: number;
  ultimoMov: string | null;
  movsSemana: number;
}

export default function Contador() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isContador, loading: loadingRole } = useUserRole();
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const hoyDisplay = new Date();

  useEffect(() => {
    if (!user || !isContador) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data: asignaciones } = await supabase
        .from("contador_clientes")
        .select("cliente_id")
        .eq("contador_id", user.id)
        .eq("estatus", "ACTIVO");

      const ids = (asignaciones ?? []).map((a: { cliente_id: string }) => a.cliente_id);
      if (ids.length === 0) {
        if (!cancelled) { setClientes([]); setLoading(false); }
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nombre, rfc, correo")
        .in("id", ids);

      const hoy = new Date();
      const start = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
      const semana = new Date(); semana.setDate(semana.getDate() - 7);
      const semanaStr = semana.toISOString().slice(0, 10);

      const { data: txs } = await supabase
        .from("transacciones")
        .select("usuario_id, tipo, monto, fecha, con_factura")
        .in("usuario_id", ids)
        .gte("fecha", start);

      const byUser = new Map<string, Movimiento[]>();
      const ultimoByUser = new Map<string, string>();
      const semanaByUser = new Map<string, number>();
      (txs ?? []).forEach((t: { usuario_id: string; tipo: string; monto: number | string; fecha: string; con_factura: boolean | null }) => {
        const arr = byUser.get(t.usuario_id) ?? [];
        arr.push({ tipo: t.tipo, monto: Number(t.monto), con_factura: t.con_factura, fecha: t.fecha });
        byUser.set(t.usuario_id, arr);
        const prev = ultimoByUser.get(t.usuario_id);
        if (!prev || t.fecha > prev) ultimoByUser.set(t.usuario_id, t.fecha);
        if (t.fecha >= semanaStr) semanaByUser.set(t.usuario_id, (semanaByUser.get(t.usuario_id) ?? 0) + 1);
      });

      const rows: ClienteRow[] = ids.map((id) => {
        const p = (profiles ?? []).find((x: { id: string }) => x.id === id) as { id: string; nombre: string | null; rfc: string | null; correo: string | null } | undefined;
        const r = calcularResumen(byUser.get(id) ?? []);
        return {
          cliente_id: id,
          nombre: p?.nombre ?? "Cliente",
          rfc: p?.rfc ?? null,
          correo: p?.correo ?? null,
          ingresos: r.ingresosTotal,
          gastos: r.gastosTotal,
          isr: r.isr,
          ultimoMov: ultimoByUser.get(id) ?? null,
          movsSemana: semanaByUser.get(id) ?? 0,
        };
      });

      if (!cancelled) {
        setClientes(rows);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, isContador]);

  const enrich = (c: ClienteRow) => {
    const sinMovs30 = !c.ultimoMov || (Date.now() - new Date(c.ultimoMov + "T00:00:00").getTime()) / 86400000 > 30;
    const gastosAltos = c.gastos > c.ingresos && c.gastos > 0;
    return { sinMovs30, gastosAltos };
  };

  const activosSemana = clientes.filter((c) => c.movsSemana > 0).length;
  const sinActividad30 = clientes.filter((c) => enrich(c).sinMovs30).length;

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return clientes.filter((c) => {
      if (term) {
        const hay =
          c.nombre.toLowerCase().includes(term) ||
          (c.correo ?? "").toLowerCase().includes(term) ||
          (c.rfc ?? "").toLowerCase().includes(term);
        if (!hay) return false;
      }
      const e = enrich(c);
      if (filtro === "activos") return c.movsSemana > 0;
      if (filtro === "inactivos") return e.sinMovs30;
      if (filtro === "alertas") return e.sinMovs30 || e.gastosAltos;
      return true;
    });
  }, [clientes, q, filtro]);

  if (loadingRole) return <SpinnerInline />;

  if (!isContador) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <button onClick={() => navigate("/perfil")} className="flex items-center gap-2 text-muted-foreground font-semibold">
          <ArrowLeft className="h-5 w-5" /> Regresar
        </button>
        <div className="rounded-2xl bg-warning-light p-6 text-center">
          <Users className="mx-auto h-12 w-12 text-warning" />
          <h1 className="mt-3 text-xl font-extrabold">Modo Contador</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Esta sección es para contadores. Si eres contador, configura tu rol desde tu perfil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-32 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">👔 Mis clientes</h1>
          <p className="text-xs text-muted-foreground font-semibold">{MESES_ES[hoyDisplay.getMonth()]} {hoyDisplay.getFullYear()}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric icon={<Users className="h-4 w-4" />} label="Total" value={clientes.length} />
        <Metric icon={<TrendingUp className="h-4 w-4 text-success" />} label="Activos" value={activosSemana} hint="esta semana" />
        <Metric icon={<AlertCircle className="h-4 w-4 text-warning" />} label="Sin mov." value={sinActividad30} hint="+30 días" />
      </div>

      {/* Búsqueda + filtros */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, correo o RFC..."
            className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2.5 text-sm outline-none ring-ring focus:ring-2"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {([
            ["todos", "Todos"],
            ["activos", "Activos"],
            ["inactivos", "Inactivos"],
            ["alertas", "Con alertas"],
          ] as [Filtro, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFiltro(k)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold border ${
                filtro === k ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
      ) : clientes.length === 0 ? (
        <EmptyState
          emoji="👥"
          title="Aún no tienes clientes asignados"
          description="Pide a tus clientes que te agreguen desde su perfil con tu correo."
        />
      ) : filtrados.length === 0 ? (
        <EmptyState emoji="🔍" title="Sin coincidencias" description="Cambia el filtro o el texto de búsqueda." />
      ) : (
        <div className="space-y-3">
          {filtrados.map((c) => {
            const e = enrich(c);
            return (
              <button
                key={c.cliente_id}
                onClick={() => navigate(`/contador/${c.cliente_id}`)}
                className="w-full text-left rounded-2xl bg-card border border-border p-4 shadow-sm active:scale-[0.99] transition"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-extrabold truncate">{c.nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.rfc ?? "Sin RFC"}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {c.ultimoMov
                        ? `Último mov: ${new Date(c.ultimoMov + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`
                        : "Sin movimientos aún"}
                    </p>
                    {(e.sinMovs30 || e.gastosAltos) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {e.sinMovs30 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-warning text-[10px] font-bold px-2 py-0.5">
                            <AlertCircle className="h-3 w-3" /> Sin movimientos 30d
                          </span>
                        )}
                        {e.gastosAltos && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold px-2 py-0.5">
                            <AlertCircle className="h-3 w-3" /> Gastos &gt; ingresos
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Ingresos" value={formatMXN(c.ingresos)} />
                  <Stat label="Gastos" value={formatMXN(c.gastos)} />
                  <Stat label="ISR est." value={formatMXN(c.isr)} highlight />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-xl bg-accent/10 p-4 text-sm flex gap-2">
        <TrendingUp className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          Solo puedes <b>ver</b> la información de tus clientes. Para registrar movimientos, ellos deben hacerlo desde su cuenta.
        </p>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">{icon}{label}</div>
      <p className="text-2xl font-extrabold mt-1">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-muted py-2 px-1">
      <p className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</p>
      <p className={`text-xs font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
