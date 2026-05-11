import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function MenuItem({
  icon, label, to, onClick, hint,
}: {
  icon: ReactNode;
  label: string;
  to?: string;
  onClick?: () => void;
  hint?: string;
}) {
  const navigate = useNavigate();
  const handle = () => {
    if (onClick) return onClick();
    if (to) navigate(to);
  };
  return (
    <button
      onClick={handle}
      disabled={!to && !onClick}
      className="flex w-full items-center gap-3 rounded-xl bg-card p-4 shadow-sm transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="text-primary">{icon}</div>
      <div className="flex-1 text-left">
        <p className="font-semibold">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider px-1">{children}</h2>;
}
