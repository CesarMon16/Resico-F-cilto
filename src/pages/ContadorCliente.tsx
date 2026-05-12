import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { calcularResumen, explicarISR, explicarIVA, formatMXN, MESES_ES, type Movimiento } from "@/lib/fiscal";
import { SpinnerInline } from "@/components/SkeletonCard";
import { EmptyState } from "@/components/EmptyState";

const HOY = new Date();

interface PerfilCliente {
  nombre: string | null;
  rfc: string | null;
  correo: string | null;
}

export default function ContadorCliente() {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isContador, loading: lr } = useUserRole();
  const [perfil, setPerfil] = useState<PerfilCliente | null>(null);
  const [movs, setMovs] = useState<(Movimiento & { id: string; descripcion: string | null })[]>([]);
  const [mes, setMes] = useState(HOY.getMonth() + 1);
  const [anio, setAnio] = useState(HOY.getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isContador || !clienteId) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
      const fin = new Date(anio, mes, 0);
      const finStr = `${anio}-${String(mes).padStart(2, "0")}-${String(fin.getDate()).padStart(2, "0")}`;
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from("profiles").select("nombre, rfc, correo").eq("id", clienteId).maybeSingle(),
        supabase
          .from("transacciones")
          .select("id, tipo, monto, descripcion, fecha, con_factura")
          .eq("usuario_id", clienteId)
          .gte("fecha", inicio)
          .lte("fecha", finStr)
          .order("fecha", { ascending: false }),
      ]);
      if (cancel) return;
      setPerfil(p);
      setMovs((t ?? []) as (Movimiento & { id: string; descripcion: string | null })[]);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [user, isContador, clienteId, mes, anio]);

  const resumen = useMemo(() => calcularResumen(movs), [movs]);

  if (lr) return <SpinnerInline />;
  if (!isContador) {
    navigate("/perfil", { replace: true });
    return null;
  }

  return (
    <div className="px-4 pt-6 pb-32 space-y-5 animate-slide-up">
      <button onClick={() => navigate("/contador")} className="flex items-center gap-2 text-muted-foreground font-semibold">
        <ArrowLeft className="h-5 w-5" /> Mis clientes
      </button>

      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase">Cliente</p>
        <h1 className="text-2xl font-extrabold">{perfil?.nombre ?? "Cargando..."}</h1>
        <p className="text-sm text-muted-foreground">{perfil?.rfc ?? "Sin RFC"} · {perfil?.correo ?? ""}</p>
      </div>

      <div className="flex gap-2">
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="flex-1 rounded-xl border border-input bg-card p-3 font-semibold outline-none focus:ring-2 ring-ring"
        >
          {MESES_ES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
          className="rounded-xl border border-input bg-card p-3 font-semibold outline-none focus:ring-2 ring-ring"
        >
          {[HOY.getFullYear() - 1, HOY.getFullYear()].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <SpinnerInline />
      ) : (
        <>
          <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
            <p className="text-sm opacity-80">Total impuestos estimados</p>
            <p className="text-3xl font-extrabold">{formatMXN(resumen.totalImpuestos)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-white/10 p-2">
                <p className="opacity-80 text-xs">ISR</p>
                <p className="font-bold">{formatMXN(resumen.isr)}</p>
              </div>
              <div className="rounded-lg bg-white/10 p-2">
                <p className="opacity-80 text-xs">IVA</p>
                <p className="font-bold">{formatMXN(Math.max(resumen.ivaAPagar, 0))}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-success-light p-3">
              <p className="text-xs text-muted-foreground font-semibold">Ingresos</p>
              <p className="font-extrabold text-success">{formatMXN(resumen.ingresosTotal)}</p>
            </div>
            <div className="rounded-xl bg-destructive/10 p-3">
              <p className="text-xs text-muted-foreground font-semibold">Gastos</p>
              <p className="font-extrabold text-destructive">{formatMXN(resumen.gastosTotal)}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border p-4 space-y-2 text-sm">
            <p>💡 {explicarISR(resumen)}</p>
            <p>💡 {explicarIVA(resumen)}</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Movimientos del periodo</h2>
            {movs.length === 0 ? (
              <EmptyState emoji="📭" title="Sin movimientos" description="El cliente no registró nada en este mes." />
            ) : (
              <div className="space-y-2">
                {movs.map((m) => (
                  <div key={m.id} className="rounded-xl bg-card border border-border p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{m.descripcion || (m.tipo === "INGRESO" ? "Venta" : "Gasto")}</p>
                      <p className="text-xs text-muted-foreground">{new Date(m.fecha + "T00:00:00").toLocaleDateString("es-MX")}</p>
                    </div>
                    <p className={`font-extrabold ${m.tipo === "INGRESO" ? "text-success" : "text-destructive"}`}>
                      {m.tipo === "INGRESO" ? "+" : "-"}{formatMXN(Number(m.monto))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Vista de solo lectura. No puedes modificar los datos del cliente.
          </p>
        </>
      )}
    </div>
  );
}
