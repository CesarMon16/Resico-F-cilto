import { useEffect, useState } from "react";
import { ArrowLeft, Users, TrendingUp, FileSearch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { calcularResumen, formatMXN, MESES_ES, type Movimiento } from "@/lib/fiscal";

interface ClienteRow {
  cliente_id: string;
  nombre: string;
  rfc: string | null;
  ingresos: number;
  gastos: number;
  isr: number;
}

export default function Contador() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isContador, loading: loadingRole } = useUserRole();
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const hoy = new Date();

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

      const ids = (asignaciones ?? []).map((a: any) => a.cliente_id);
      if (ids.length === 0) {
        if (!cancelled) { setClientes([]); setLoading(false); }
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nombre, rfc")
        .in("id", ids);

      const start = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
      const { data: txs } = await supabase
        .from("transacciones")
        .select("usuario_id, tipo, monto, fecha, con_factura")
        .in("usuario_id", ids)
        .gte("fecha", start);

      const byUser = new Map<string, Movimiento[]>();
      (txs ?? []).forEach((t: any) => {
        const arr = byUser.get(t.usuario_id) ?? [];
        arr.push({ tipo: t.tipo, monto: Number(t.monto), con_factura: t.con_factura, fecha: t.fecha });
        byUser.set(t.usuario_id, arr);
      });

      const rows: ClienteRow[] = ids.map((id) => {
        const p = (profiles ?? []).find((x: any) => x.id === id) as any;
        const r = calcularResumen(byUser.get(id) ?? []);
        return {
          cliente_id: id,
          nombre: p?.nombre ?? "Cliente",
          rfc: p?.rfc ?? null,
          ingresos: r.ingresosTotal,
          gastos: r.gastosTotal,
          isr: r.isr,
        };
      });

      if (!cancelled) {
        setClientes(rows);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, isContador]);

  if (loadingRole) {
    return <div className="p-6 text-center text-muted-foreground">Cargando...</div>;
  }

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
            Esta sección es para contadores. Si eres contador y necesitas acceso, pide al administrador que active tu cuenta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">👔 Mis clientes</h1>
        <span className="text-xs text-muted-foreground font-semibold">
          {MESES_ES[hoy.getMonth()]} {hoy.getFullYear()}
        </span>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Cargando clientes...</p>
      ) : clientes.length === 0 ? (
        <div className="rounded-2xl bg-muted p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-3 font-bold">Aún no tienes clientes asignados</p>
          <p className="text-sm text-muted-foreground mt-1">
            Pide a tus clientes que te agreguen desde su perfil con tu correo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {clientes.map((c) => (
            <div key={c.cliente_id} className="rounded-2xl bg-card border border-border p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-extrabold">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground">{c.rfc ?? "Sin RFC"}</p>
                </div>
                <FileSearch className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Ingresos" value={formatMXN(c.ingresos)} />
                <Stat label="Gastos" value={formatMXN(c.gastos)} />
                <Stat label="ISR est." value={formatMXN(c.isr)} highlight />
              </div>
            </div>
          ))}
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

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-muted py-2 px-1">
      <p className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</p>
      <p className={`text-xs font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
