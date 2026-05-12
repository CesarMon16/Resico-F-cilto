import { useEffect, useState } from "react";
import { Briefcase, FileText, Phone, Store, User, UserPlus, Trash2, TrendingUp, TrendingDown, Camera, HandCoins, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNegocio } from "@/hooks/useNegocio";
import { MenuItem, SectionTitle } from "./MenuItem";

interface ContadorAsignado {
  id: string;
  nombre: string;
  correo: string | null;
}

export function UserProfileView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { negocio } = useNegocio();
  const [contador, setContador] = useState<ContadorAsignado | null>(null);
  const [emailContador, setEmailContador] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { cargarContador(); /* eslint-disable-next-line */ }, [user]);

  async function cargarContador() {
    if (!user) return;
    const { data } = await supabase
      .from("contador_clientes")
      .select("id, contador_id")
      .eq("cliente_id", user.id)
      .eq("estatus", "ACTIVO")
      .maybeSingle();
    if (!data) { setContador(null); return; }
    const { data: p } = await supabase
      .from("profiles").select("nombre, correo").eq("id", data.contador_id).maybeSingle();
    setContador({ id: data.id, nombre: p?.nombre ?? "Contador", correo: p?.correo ?? null });
  }

  async function asignar() {
    if (!user) return;
    if (!emailContador.trim()) { toast.error("Escribe el correo de tu contador"); return; }
    setBusy(true);
    try {
      const { asignarContadorPorCorreo } = await import("@/services/contador.service");
      await asignarContadorPorCorreo(user.id, emailContador);
      toast.success("¡Contador asignado! 👔");
      setEmailContador("");
      cargarContador();
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo asignar");
    } finally {
      setBusy(false);
    }
  }

  async function quitar() {
    if (!contador) return;
    setBusy(true);
    try {
      const { quitarAsignacion } = await import("@/services/contador.service");
      await quitarAsignacion(contador.id);
      toast.success("Contador removido");
      setContador(null);
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo quitar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Acciones rápidas */}
      <div>
        <SectionTitle>Acciones rápidas</SectionTitle>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <QuickBtn icon={<TrendingUp className="h-5 w-5" />} label="Ingreso" tone="success" onClick={() => navigate("/registrar/ingreso")} />
          <QuickBtn icon={<TrendingDown className="h-5 w-5" />} label="Gasto" tone="danger" onClick={() => navigate("/registrar/gasto")} />
          <QuickBtn icon={<Camera className="h-5 w-5" />} label="Ticket" tone="primary" onClick={() => navigate("/expediente")} />
        </div>
      </div>

      {/* Mi contador */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <p className="font-bold">Mi contador</p>
        </div>
        {contador ? (
          <div className="rounded-xl bg-muted p-3 flex items-center justify-between">
            <div>
              <p className="font-bold">{contador.nombre}</p>
              <p className="text-xs text-muted-foreground">{contador.correo}</p>
            </div>
            <button onClick={quitar} disabled={busy} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive" aria-label="Quitar contador">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Aún no tienes contador. Si trabajas con uno, agrégalo con su correo — solo podrá ver tus números.
            </p>
            <div className="flex gap-2">
              <input
                type="email" value={emailContador} onChange={(e) => setEmailContador(e.target.value)}
                placeholder="correo@contador.com"
                className="flex-1 rounded-lg border border-input bg-background p-2 text-sm outline-none ring-ring focus:ring-2"
              />
              <button onClick={asignar} disabled={busy}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground active:scale-95 disabled:opacity-50">
                <UserPlus className="h-4 w-4" /> Asignar
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mis cosas */}
      <div className="space-y-2">
        <SectionTitle>Mi información</SectionTitle>
        <MenuItem icon={<User className="h-5 w-5" />} label="Mi perfil fiscal" to="/perfil/fiscal" hint="RFC, régimen, datos del SAT" />
        <MenuItem icon={<Store className="h-5 w-5" />} label="Mi negocio" to="/preparar-negocio" hint={negocio?.nombre_negocio ?? "Configura tu negocio"} />
        <MenuItem icon={<BookOpen className="h-5 w-5" />} label="Mi historial fiscal" to="/historial-fiscal" hint="Mes a mes, todo en un lugar" />
        <MenuItem icon={<FileText className="h-5 w-5" />} label="Mis documentos" to="/expediente" hint="Tickets y comprobantes" />
        <MenuItem icon={<HandCoins className="h-5 w-5" />} label="Créditos y apoyos" to="/creditos" />
        <MenuItem icon={<Phone className="h-5 w-5" />} label="Cambiar teléfono" hint="Próximamente" />
      </div>
    </div>
  );
}

function QuickBtn({ icon, label, onClick, tone }: { icon: React.ReactNode; label: string; onClick: () => void; tone: "success" | "danger" | "primary" }) {
  const cls = {
    success: "bg-success-light text-success",
    danger: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
  }[tone];
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 rounded-xl p-3 font-semibold text-xs ${cls}`}>
      {icon}
      {label}
    </button>
  );
}
