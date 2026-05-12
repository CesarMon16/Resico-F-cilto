import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Store, Receipt, PieChart, Settings2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminUsersList } from "@/components/admin/AdminUsersList";
import { AdminFiscalRules } from "@/components/admin/AdminFiscalRules";
import { AdminGirosChart } from "@/components/admin/AdminGirosChart";
import { AdminGrowthChart } from "@/components/admin/AdminGrowthChart";
import { AdminAuditLog } from "@/components/admin/AdminAuditLog";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Activity, History } from "lucide-react";

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

  const totalNegocios = stats.negocios || 1;

  return (
    <div className="px-4 pt-6 space-y-6 pb-24">
      <div>
        <p className="text-muted-foreground text-sm font-semibold">Plataforma RESICO</p>
        <h1 className="text-2xl font-extrabold">Dashboard Institucional</h1>
      </div>

      <Tabs defaultValue="metricas" className="w-full">
        <TabsList className="w-full mb-6 grid grid-cols-4 h-auto p-1 bg-muted/50 rounded-2xl">
          <TabsTrigger value="metricas" className="rounded-xl py-2">Métricas</TabsTrigger>
          <TabsTrigger value="usuarios" className="rounded-xl py-2">Usuarios</TabsTrigger>
          <TabsTrigger value="auditoria" className="rounded-xl py-2">Auditoría</TabsTrigger>
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
                <StatCard icon={Users} label="Usuarios" value={stats.usuarios} color="bg-blue-500" />
                <StatCard icon={Store} label="Negocios" value={stats.negocios} color="bg-purple-500" />
                <StatCard icon={Receipt} label="Ventas/Gastos" value={stats.transacciones} color="bg-emerald-500" />
                <StatCard icon={Activity} label="Salud Sistema" value="99.9%" color="bg-orange-500" isPercentage />
              </div>

              {/* Gráfica de Crecimiento */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm overflow-hidden relative">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h2 className="font-extrabold text-xl">Actividad Global</h2>
                    <p className="text-muted-foreground text-sm">Transacciones registradas por mes</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-none px-3 py-1">
                    <TrendingUp className="h-3 w-3 mr-1" /> +12%
                  </Badge>
                </div>
                <AdminGrowthChart />
              </div>

              {/* Segmentación por Giro */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <PieChart className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-xl">Mercado por Giro</h2>
                    <p className="text-muted-foreground text-sm">Distribución de tipos de negocio</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <AdminGirosChart data={giros} />
                  <div className="space-y-4">
                    {Object.entries(giros)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 4)
                      .map(([giro, count]) => (
                        <div key={giro} className="space-y-1.5">
                          <div className="flex justify-between text-sm font-bold">
                            <span>{giro}</span>
                            <span>{Math.round((count / totalNegocios) * 100)}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-1000" 
                              style={{ width: `${(count / totalNegocios) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="usuarios" className="mt-0">
          <AdminUsersList />
        </TabsContent>

        <TabsContent value="auditoria" className="mt-0">
          <AdminAuditLog />
        </TabsContent>

        <TabsContent value="reglas" className="mt-0">
          <AdminFiscalRules />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color,
  isPercentage = false 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number | string;
  color: string;
  isPercentage?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md relative overflow-hidden group">
      <div className={`absolute -right-2 -top-2 h-16 w-16 rounded-full ${color} opacity-[0.03] group-hover:scale-150 transition-transform duration-500`} />
      <div className={`p-2 rounded-xl w-fit mb-3 ${color} bg-opacity-10 text-opacity-100`}>
        <Icon className={`h-5 w-5`} style={{ color: 'inherit' }} />
      </div>
      <p className="text-3xl font-black tracking-tight">{value}{isPercentage ? "" : ""}</p>
      <p className="text-[10px] text-muted-foreground font-black mt-1 uppercase tracking-widest">{label}</p>
    </div>
  );
}
