import { saludFinanciera, type ResumenFiscal } from "@/lib/fiscal";

export function SaludFinanciera({ resumen }: { resumen: ResumenFiscal }) {
  const s = saludFinanciera(resumen);
  const tone =
    s.nivel === "bien"
      ? "bg-success-light border-success/30 text-success"
      : s.nivel === "atento"
      ? "bg-warning-light border-warning/30 text-warning"
      : "bg-destructive/10 border-destructive/30 text-destructive";

  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-3 ${tone}`}>
      <span className="text-3xl leading-none">{s.emoji}</span>
      <div>
        <p className="text-xs font-semibold opacity-80">Tu salud financiera</p>
        <p className="font-extrabold text-foreground">{s.mensaje}</p>
      </div>
    </div>
  );
}
