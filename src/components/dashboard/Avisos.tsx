import { useState } from "react";
import { Bell, X } from "lucide-react";
import { useAvisos } from "@/hooks/useResumenMes";

export function Avisos() {
  const avisos = useAvisos();
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="relative rounded-full bg-muted p-2.5 transition-colors hover:bg-border"
        aria-label="Avisos"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {avisos.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground border-2 border-card">
            {avisos.length}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-border bg-card p-3 shadow-lg animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-sm">Avisos</p>
              <button onClick={() => setAbierto(false)} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            {avisos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">
                Todo al día ✅
              </p>
            ) : (
              <ul className="space-y-2">
                {avisos.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start gap-2 rounded-xl bg-muted px-3 py-2 text-sm"
                  >
                    <span className="text-lg leading-none">{a.emoji}</span>
                    <span className="text-foreground">{a.texto}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
