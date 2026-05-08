import { useState } from "react";
import { Send, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const montos = [5000, 10000, 25000, 50000];

export default function Creditos() {
  const { user } = useAuth();
  const [monto, setMonto] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSolicitar = async () => {
    if (!monto) {
      toast.error("Selecciona un monto primero");
      return;
    }
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("creditos").insert({
      usuario_id: user.id,
      monto_solicitado: monto,
      estatus: "SOLICITADO",
    });
    setBusy(false);
    if (error) {
      toast.error("No se pudo enviar. Intenta de nuevo");
      return;
    }
    toast.success("¡Solicitud enviada! Te contactaremos pronto 🎉");
    setMonto(null);
  };

  return (
    <div className="px-4 pt-6 space-y-6">
      <h1 className="text-2xl font-extrabold">💳 Créditos y apoyos</h1>

      <div className="rounded-2xl bg-accent/15 p-5">
        <div className="flex items-start gap-3">
          <Info className="h-6 w-6 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">¿Necesitas dinero para tu negocio?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Selecciona cuánto necesitas y nosotros te ayudamos a encontrar la mejor opción.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-bold">¿Cuánto necesitas?</h2>
        <div className="grid grid-cols-2 gap-3">
          {montos.map((m) => (
            <button
              key={m}
              onClick={() => setMonto(m)}
              className={`rounded-xl border-2 p-4 text-center font-bold text-lg transition-all active:scale-95 ${
                monto === m ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border bg-card text-foreground"
              }`}
            >
              ${m.toLocaleString("es-MX")}
            </button>
          ))}
        </div>
      </div>

      {monto && (
        <div className="rounded-2xl bg-muted p-5 space-y-2 animate-fade-in">
          <p className="font-bold text-lg">Simulación rápida</p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Monto</span>
            <span className="font-bold">${monto.toLocaleString("es-MX")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Plazo</span>
            <span className="font-bold">12 meses</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pago mensual aprox.</span>
            <span className="font-bold text-primary">
              ${Math.round((monto * 1.18) / 12).toLocaleString("es-MX")}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={handleSolicitar}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary p-4 text-lg font-bold text-primary-foreground shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
      >
        <Send className="h-5 w-5" />
        {busy ? "Enviando..." : "Solicitar crédito"}
      </button>
    </div>
  );
}
