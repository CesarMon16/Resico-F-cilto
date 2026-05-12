import { useEffect, useState } from "react";
import { Users, Briefcase, Bell, FileText, Settings, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MenuItem, SectionTitle } from "./MenuItem";

export function AccountantProfileView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientesActivos, setClientesActivos] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase
        .from("contador_clientes")
        .select("*", { count: "exact", head: true })
        .eq("contador_id", user.id)
        .eq("estatus", "ACTIVO");
      setClientesActivos(count ?? 0);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* CTA principal */}
      <button
        onClick={() => navigate("/contador")}
        className="flex w-full items-center gap-3 rounded-2xl bg-primary p-5 text-primary-foreground shadow-md active:scale-[0.98] transition-transform"
      >
        <Users className="h-6 w-6" />
        <span className="flex-1 text-left font-extrabold text-lg">Gestionar clientes</span>
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Métricas rápidas */}
      <div>
        <SectionTitle>Resumen de actividad</SectionTitle>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="Clientes" value={loading ? "…" : String(clientesActivos)} />
          <Stat label="Declaraciones" value="—" />
          <Stat label="Pendientes" value="—" />
        </div>
      </div>

      {/* Empty state si no hay clientes */}
      {!loading && clientesActivos === 0 && (
        <div className="rounded-2xl bg-muted p-6 text-center space-y-3">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-bold">Aún no tienes clientes asignados</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pide a tus clientes que te agreguen desde su perfil con tu correo.
            </p>
          </div>
        </div>
      )}

      {/* Menú profesional */}
      <div className="space-y-2">
        <SectionTitle>Mi cuenta profesional</SectionTitle>
        <MenuItem icon={<Briefcase className="h-5 w-5" />} label="Mi despacho" to="/onboarding-contador" hint="Editar datos profesionales" />
        <MenuItem icon={<Users className="h-5 w-5" />} label="Mis clientes" to="/contador" />
        <MenuItem icon={<FileText className="h-5 w-5" />} label="Documentos compartidos" hint="Próximamente" />
        <MenuItem icon={<Bell className="h-5 w-5" />} label="Notificaciones" hint="Próximamente" />
        <MenuItem icon={<Settings className="h-5 w-5" />} label="Configuración" hint="Próximamente" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-3 text-center">
      <p className="text-xl font-extrabold text-primary">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
    </div>
  );
}
