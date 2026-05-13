import { type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface QuickActionCardProps {
  icon: LucideIcon;
  label: string;
  to: string;
  variant: "income" | "expense";
  state?: any;
}

export function QuickActionCard({ icon: Icon, label, to, variant, state }: QuickActionCardProps) {
  return (
    <Link
      to={to}
      state={state}
      className={`big-action-btn ${
        variant === "income"
          ? "bg-income-light text-income"
          : "bg-expense-light text-expense"
      }`}
    >
      <Icon className="h-10 w-10" />
      <span>{label}</span>
    </Link>
  );
}
