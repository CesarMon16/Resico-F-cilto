import { TrendingUp, TrendingDown, Bell } from "lucide-react";
import { SummaryCard } from "@/components/SummaryCard";
import { QuickActionCard } from "@/components/QuickActionCard";
import { TransactionItem } from "@/components/TransactionItem";
import { mockTransactions, mockSummary } from "@/lib/mockData";

export default function Dashboard() {
  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">¡Hola! 👋</p>
          <h1 className="text-2xl font-extrabold">María García</h1>
        </div>
        <button className="relative rounded-full bg-muted p-2.5 transition-colors hover:bg-border">
          <Bell className="h-5 w-5 text-foreground" />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-secondary border-2 border-card" />
        </button>
      </div>

      {/* Summary */}
      <SummaryCard
        ingresos={mockSummary.ingresos}
        gastos={mockSummary.gastos}
        periodo={mockSummary.periodo}
      />

      {/* Quick Actions */}
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

      {/* Recent */}
      <div>
        <h2 className="mb-3 font-bold text-lg">Últimos movimientos</h2>
        <div className="space-y-3">
          {mockTransactions.slice(0, 4).map((t) => (
            <TransactionItem key={t.id} {...t} />
          ))}
        </div>
      </div>
    </div>
  );
}
