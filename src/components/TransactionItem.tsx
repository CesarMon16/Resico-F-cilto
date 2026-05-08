import { TrendingUp, TrendingDown } from "lucide-react";

interface TransactionItemProps {
  title: string;
  amount: number;
  date: string;
  type: "ingreso" | "gasto";
}

export function TransactionItem({ title, amount, date, type }: TransactionItemProps) {
  const isIncome = type === "ingreso";

  return (
    <div className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2 ${isIncome ? "bg-income-light text-income" : "bg-expense-light text-expense"}`}>
          {isIncome ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
        </div>
        <div>
          <p className="font-bold">{title}</p>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
      </div>
      <p className={`font-extrabold ${isIncome ? "text-income" : "text-expense"}`}>
        {isIncome ? "+" : "-"}${amount.toLocaleString("es-MX")}
      </p>
    </div>
  );
}
