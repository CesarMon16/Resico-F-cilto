import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Bell } from "lucide-react";
import { SummaryCard } from "@/components/SummaryCard";
import { QuickActionCard } from "@/components/QuickActionCard";
import { TransactionItem } from "@/components/TransactionItem";
import { supabase } from "@/lib/supabase";

interface Transaction {
  id: string;
  descripcion: string;
  monto: number;
  tipo: "ingreso" | "gasto";
  fecha: string;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<{ email?: string; full_name?: string }>({});
  const [summary, setSummary] = useState({
    ingresos: 0,
    gastos: 0,
    periodo: ""
  });
  
  const [recientes, setRecientes] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserData({
            email: user.email,
            full_name: user.user_metadata?.full_name
          });
        }

        const { data, error } = await supabase
          .from('transacciones')
          .select('*')
          .order('fecha', { ascending: false });

        if (error) throw error;

        const transacciones = (data as any[] || []).map(t => ({
          id: t.id,
          descripcion: t.descripcion || (t.tipo === 'ingreso' ? 'Venta' : 'Gasto'),
          monto: Number(t.monto),
          tipo: t.tipo as "ingreso" | "gasto",
          fecha: t.fecha
        }));

        let totalIngresos = 0;
        let totalGastos = 0;

        transacciones.forEach((t) => {
          if (t.tipo === 'ingreso') totalIngresos += t.monto;
          else totalGastos += t.monto;
        });

        const mesActual = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

        setSummary({
          ingresos: totalIngresos,
          gastos: totalGastos,
          periodo: mesActual.charAt(0).toUpperCase() + mesActual.slice(1)
        });

        setRecientes(transacciones.slice(0, 3));

      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-10 text-center animate-pulse">Cargando...</div>;

  return (
    <div className="px-4 pt-6 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">¡Hola! 👋</p>
          <h1 className="text-2xl font-extrabold">
            {userData.full_name || userData.email?.split('@')[0] || "Usuario"}
          </h1>
        </div>
        <button className="relative rounded-full bg-muted p-2.5">
          <Bell className="h-5 w-5 text-foreground" />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-secondary border-2 border-card" />
        </button>
      </div>

      <SummaryCard
        ingresos={summary.ingresos}
        gastos={summary.gastos}
        periodo={summary.periodo}
      />

      <div>
        <h2 className="mb-3 font-bold text-lg">¿Qué hiciste hoy?</h2>
        <div className="grid grid-cols-2 gap-4">
          <QuickActionCard
            icon={TrendingUp}
            label="Hoy vendí"
            to="/registrar/ingreso"
            variant="income"
          />
          <QuickActionCard
            icon={TrendingDown}
            label="Hoy compré"
            to="/registrar/gasto"
            variant="expense"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-bold text-lg">Últimos movimientos</h2>
        <div className="space-y-3">
          {recientes.map((t) => (
            <TransactionItem
              key={t.id}
              title={t.descripcion}
              amount={t.monto}
              date={new Date(t.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
              type={t.tipo}
            />
          ))}
          {recientes.length === 0 && (
            <p className="text-center text-muted-foreground py-4 text-sm font-bold">No hay movimientos</p>
          )}
        </div>
      </div>
    </div>
  );
}