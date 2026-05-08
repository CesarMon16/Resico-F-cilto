import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

export interface Transaction {
  id: string;
  tipo: "ingreso" | "gasto" | "INGRESO" | "GASTO";
  monto: number;
  descripcion: string;
  fecha: string;
}

export function TransactionItem({ tipo, monto, descripcion, fecha }: Transaction) {
  const isIngreso = tipo === "ingreso" || tipo === "INGRESO";
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm animate-fade-in">
      <div className={`rounded-full p-2 ${isIngreso ? "bg-income-light" : "bg-expense-light"}`}>
        {isIngreso ? (
          <ArrowUpCircle className="h-6 w-6 text-income" />
        ) : (
          <ArrowDownCircle className="h-6 w-6 text-expense" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{descripcion || (isIngreso ? "Venta" : "Gasto")}</p>
        <p className="text-xs text-muted-foreground">{fecha}</p>
      </div>
      <p className={`font-bold ${isIngreso ? "text-income" : "text-expense"}`}>
        {isIngreso ? "+" : "-"}${Number(monto).toLocaleString("es-MX")}
      </p>
    </div>
  );
}
