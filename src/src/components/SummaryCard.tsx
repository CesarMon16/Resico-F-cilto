import { TrendingUp, TrendingDown } from "lucide-react";

interface SummaryCardProps {
  ingresos: number;
  gastos: number;
  periodo: string;
}

export function SummaryCard({ ingresos, gastos, periodo }: SummaryCardProps) {
  const balance = ingresos - gastos;

  return (
    <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-lg animate-fade-in">
      <p className="text-sm opacity-80">Resumen de {periodo}</p>
      <p className="mt-1 text-3xl font-extrabold">
        ${balance.toLocaleString("es-MX")}
      </p>
      <p className="text-sm opacity-80">Balance</p>
      <div className="mt-4 flex gap-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <div>
            <p className="text-xs opacity-70">Vendiste</p>
            <p className="font-bold">${ingresos.toLocaleString("es-MX")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          <div>
            <p className="text-xs opacity-70">Gastaste</p>
            <p className="font-bold">${gastos.toLocaleString("es-MX")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
