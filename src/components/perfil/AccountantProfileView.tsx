import { useEffect, useState } from "react";
import { Users, Briefcase, Bell, FileText, Settings, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MenuItem, SectionTitle } from "./MenuItem";
import { formatMXN } from "@/lib/fiscal";
import { Loader2, ExternalLink } from "lucide-react";

export function AccountantProfileView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientesActivos, setClientesActivos] = useState(0);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: rels, error: relsError } = await supabase
        .from("contador_clientes")
        .select(`
          id,
          cliente_id,
          created_at,
          estatus
        `)
        .eq("contador_id", user.id)
        .order("created_at", { ascending: false });

      if (rels && rels.length > 0) {
        setClientesActivos(rels.filter(r => r.estatus === "ACTIVO").length);
        
        // Fetch profiles for these clients
        const clientIds = rels.map(r => r.cliente_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nombre, correo")
          .in("id", clientIds);

        const combined = rels.map(r => ({
          ...r,
          perfil: profiles?.find(p => p.id === r.cliente_id)
        }));
        setClientes(combined);
      }
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

      {/* Lista de clientes (Data Table) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle>Mis clientes vinculados</SectionTitle>
          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {clientes.length} total
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="rounded-2xl bg-muted p-6 text-center space-y-3">
            <Users className="mx-auto h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-bold">Aún no tienes clientes</p>
              <p className="text-xs text-muted-foreground mt-1">
                Pide a tus clientes que te agreguen con tu correo.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 text-center">Vinculación</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clientes.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-bold">{c.perfil?.nombre || "Sin nombre"}</p>
                      <p className="text-[10px] text-muted-foreground">{c.perfil?.correo || c.cliente_id.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        c.estatus === "ACTIVO" ? "bg-success-light text-success" : "bg-warning-light text-warning"
                      }`}>
                        {c.estatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => navigate(`/contador/${c.cliente_id}`)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
