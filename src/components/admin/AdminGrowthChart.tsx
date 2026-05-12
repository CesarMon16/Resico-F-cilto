import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AdminGrowthChart() {
  const [data, setData] = useState<{ month: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGrowth() {
      // Obtenemos transacciones de los últimos 6 meses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data: txs } = await supabase
        .from("transacciones")
        .select("fecha")
        .gte("fecha", sixMonthsAgo.toISOString().split("T")[0]);

      if (txs) {
        const counts: { [key: string]: number } = {};
        txs.forEach(t => {
          const month = new Date(t.fecha).toLocaleString('es-MX', { month: 'short' });
          counts[month] = (counts[month] || 0) + 1;
        });

        // Ordenar meses cronológicamente (simplificado para el ejemplo)
        const months = Object.entries(counts).map(([month, count]) => ({ month, count }));
        setData(months);
      }
      setLoading(false);
    }
    fetchGrowth();
  }, []);

  if (loading) return <div className="h-[200px] flex items-center justify-center text-muted-foreground">Analizando tendencias...</div>;

  return (
    <div className="h-[250px] w-full mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#64748B' }} 
          />
          <YAxis hide />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke="#8B5CF6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorCount)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
