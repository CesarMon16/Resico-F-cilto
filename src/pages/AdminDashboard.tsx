import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Store, Receipt, PieChart, Settings2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminUsersList } from "@/components/admin/AdminUsersList";
import { AdminFiscalRules } from "@/components/admin/AdminFiscalRules";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    usuarios: 0,
    negocios: 0,
    transacciones: 0,
  });
  const [giros, setGiros] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      // Ejecutamos las llamadas en paralelo para mayor rapidez
      const [
        { count: usuariosCount },
        { data: negociosData, count: negociosCount },
        { count: transaccionesCount }
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("negocios").select("giro", { count: "exact" }),
        supabase.from("transacciones").select("*", { count: "exact", head: true })
      ]);

      // Agrupar por giro
      const agrupado: { [key: string]: number } = {};
      if (negociosData) {
        negociosData.forEach((n) => {
          const giro = n.giro || "No especificado";
          agrupado[giro] = (agrupado[giro] || 0) + 1;
        });
      }

      setStats({
        usuarios: usuariosCount || 0,
        negocios: negociosCount || 0,
        transacciones: transaccionesCount || 0,
      });
      setGiros(agrupado);
      setLoading(false);
    }
    
    fetchStats();
  }, []);

  return (
    <div className="px-4 pt-6 space-y-6 pb-24">
      <div>
        <p className="text-muted-foreground text-sm font-semibold">Plataforma RESICO</p>
        <h1 className="text-2xl font-extrabold">Dashboard Institucional</h1>
      </div>

      <Tabs defaultValue="metricas" className="w-full">
        <TabsList className="w-full mb-6 grid grid-cols-3 h-auto p-1 bg-muted/50 rounded-2xl">
          <TabsTrigger value="metricas" className="rounded-xl py-2">Métricas</TabsTrigger>
          <TabsTrigger value="usuarios" className="rounded-xl py-2">Usuarios</TabsTrigger>
          <TabsTrigger value="reglas" className="rounded-xl py-2">Reglas</TabsTrigger>
        </TabsList>

        <TabsContent value="metricas" className="space-y-6 mt-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
              <p className="font-semibold">Cargando métricas globales...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={Users} label="Usuarios totales" value={stats.usuarios} />
                <StatCard icon={Store} label="Negocios activos" value={stats.negocios} />
                <StatCard icon={Receipt} label="Transacciones" value={stats.transacciones} />
              </div>

              <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <PieChart className="h-5 w-5" />
                  </div>
                  <h2 className="font-extrabold text-lg">Segmentación por Giro</h2>
                </div>
                
                <div className="space-y-4">
                  {Object.entries(giros).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay negocios registrados.</p>
                  ) : (
                    Object.entries(giros)
                      .sort((a, b) => b[1] - a[1]) // Ordenar de mayor a menor
                      .map(([giro, count]) => (
                        <div key={giro} className="flex justify-between items-center">
                          <span className="text-sm font-bold text-muted-foreground line-clamp-1 mr-4">{giro}</span>
                          <span className="text-base font-extrabold bg-muted px-3 py-1 rounded-xl whitespace-nowrap">
                            {count} {count === 1 ? "negocio" : "negocios"}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="usuarios" className="mt-0">
          <AdminUsersList />
        </TabsContent>

        <TabsContent value="reglas" className="mt-0">
          <AdminFiscalRules />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:scale-[1.02]">
      <Icon className="h-8 w-8 text-primary mb-3 opacity-90" />
      <p className="text-3xl font-black tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground font-bold mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}
