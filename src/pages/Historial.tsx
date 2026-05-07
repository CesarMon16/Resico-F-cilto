import { TransactionItem } from "@/components/TransactionItem";
import { mockTransactions } from "@/lib/mockData";
import { useState } from "react";

const filters = ["Todos", "Ventas", "Gastos"] as const;

export default function Historial() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");

  const filtered = mockTransactions.filter((t) => {
    if (filter === "Ventas") return t.tipo === "ingreso";
    if (filter === "Gastos") return t.tipo === "gasto";
    return true;
  });

  return (
    <div className="px-4 pt-6 space-y-5">
      <h1 className="text-2xl font-extrabold">📋 Tu historial</h1>

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
              filter === f
                ? "bg-primary text-primary-foreground shadow"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((t) => (
          <TransactionItem key={t.id} {...t} />
        ))}
      </div>
    </div>
  );
}
