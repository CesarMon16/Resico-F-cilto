import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Store, Receipt, PieChart, Settings2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminUsersList } from "@/components/admin/AdminUsersList";
import { AdminFiscalRules } from "@/components/admin/AdminFiscalRules";
import { useAdminMetrics } from "@/hooks/useAdminMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie
} from "recharts";

export default function AdminDashboard() {
  const { metrics, loading } = useAdminMetrics();
  
  const COLORS = ["#8B5CF6", "#D946EF", "#F97316", "#0EA5E9", "#10B981"];

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
          {loading || !metrics ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
              <p className="font-semibold">Calculando métricas globales...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={Users} label="Usuarios totales" value={metrics.total_usuarios} />
                <StatCard 
                  icon={PieChart} 
                  label="Crecimiento" 
                  value={`${metrics.tasa_crecimiento_mensual}%`} 
                  isString 
                />
              </div>

              <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-5 pb-2">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <BarChart className="h-5 w-5" />
                  </div>
                  <CardTitle className="font-extrabold text-lg">Distribución por Giro</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <div className="h-[250px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.distribucion_giros} layout="vertical" margin={{ left: -20, right: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="giro" 
                          type="category" 
                          tick={{ fontSize: 10, fontWeight: 700 }} 
                          width={100}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="cantidad" radius={[0, 8, 8, 0]} barSize={24}>
                          {metrics.distribucion_giros.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    {metrics.distribucion_giros.map((item, index) => (
                      <div key={item.giro} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="font-bold text-muted-foreground">{item.giro}</span>
                        </div>
                        <span className="font-extrabold">{item.cantidad}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  isString = false 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number | string;
  isString?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:scale-[1.02]">
      <Icon className="h-8 w-8 text-primary mb-3 opacity-90" />
      <p className="text-3xl font-black tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground font-bold mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}
