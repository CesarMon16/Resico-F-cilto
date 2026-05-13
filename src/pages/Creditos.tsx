import { useEffect, useState } from "react";
import { Send, Info, Calculator, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { solicitarCredito } from "@/services/creditos.service";
import { handleError } from "@/lib/errors";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { SpinnerInline } from "@/components/SkeletonCard";

export default function Creditos() {
  const { user } = useAuth();
  const [monto, setMonto] = useState<number>(5000);
  const [plazo, setPlazo] = useState<number>(12);
  const [busy, setBusy] = useState(false);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [limiteMaximo, setLimiteMaximo] = useState<number>(5000);

  useEffect(() => {
    if (!user) return;
    async function cargarIngresos() {
      try {
        const { data, error } = await supabase
          .from("transacciones")
          .select("monto")
          .eq("usuario_id", user.id)
          .eq("tipo", "INGRESO");

        if (error) throw error;

        // Sumar todos los ingresos históricos
        const ingresosTotales = data.reduce((acc, curr) => acc + Number(curr.monto), 0);
        
        // El crédito máximo sugerido es 3 veces sus ingresos, con un piso de 5,000 y techo de 500,000
        const maxCalculado = Math.max(5000, Math.min(500000, ingresosTotales * 3));
        
        // Redondear a miles
        const maxRedondeado = Math.round(maxCalculado / 1000) * 1000;
        
        setLimiteMaximo(maxRedondeado);
        setMonto(Math.min(10000, maxRedondeado)); // Empieza en 10,000 o el límite si es menor
      } catch (err) {
        console.error("Error al cargar ingresos:", err);
      } finally {
        setLoadingDatos(false);
      }
    }
    cargarIngresos();
  }, [user]);

  const handleSolicitar = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await solicitarCredito(user.id, monto);
      toast.success("¡Solicitud enviada! Te contactaremos pronto 🎉");
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  // Simulación simple: 1.5% de interés mensual fijo
  const interesMensual = 0.015;
  const montoTotal = monto * (1 + (interesMensual * plazo));
  const pagoMensual = Math.round(montoTotal / plazo);

  if (loadingDatos) {
    return (
      <div className="px-4 pt-10 text-center space-y-4">
        <SpinnerInline />
        <p className="text-muted-foreground font-semibold">Analizando tu perfil crediticio...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-8 pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground font-semibold">
        <ArrowLeft className="h-5 w-5" /> Regresar
      </button>
      <h1 className="text-2xl font-extrabold">💳 Créditos y apoyos</h1>

      <div className="rounded-3xl bg-success/15 p-5 border border-success/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-success/20 rounded-xl">
            <TrendingUp className="h-6 w-6 text-success shrink-0" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight text-success-foreground">¡Tienes un crédito pre-aprobado!</p>
            <p className="text-sm text-success-foreground/80 mt-1">
              Basado en tus ingresos registrados, podemos ofrecerte hasta <b>${limiteMaximo.toLocaleString("es-MX")}</b>.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <div className="flex justify-between items-end mb-5">
            <h2 className="font-bold text-lg">¿Cuánto necesitas?</h2>
            <span className="text-3xl font-black text-primary">${monto.toLocaleString("es-MX")}</span>
          </div>
          
          <Slider
            value={[monto]}
            onValueChange={(vals) => setMonto(vals[0])}
            max={limiteMaximo}
            min={1000}
            step={1000}
            className="my-6"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground font-extrabold uppercase">
            <span>$1,000</span>
            <span>${limiteMaximo.toLocaleString("es-MX")}</span>
          </div>
        </div>

        <div>
          <h2 className="font-bold text-lg mb-3">¿En cuánto tiempo quieres pagarlo?</h2>
          <div className="grid grid-cols-4 gap-2">
            {[3, 6, 12, 24].map((p) => (
              <button
                key={p}
                onClick={() => setPlazo(p)}
                className={`rounded-2xl border-2 py-3 text-center font-bold transition-all active:scale-95 ${
                  plazo === p 
                    ? "border-primary bg-primary text-primary-foreground shadow-md" 
                    : "border-border bg-card text-foreground hover:border-primary/30"
                }`}
              >
                {p} <span className="block text-[10px] font-semibold opacity-80 uppercase">meses</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="h-5 w-5 text-primary" />
          <p className="font-extrabold text-lg">Resumen de tu crédito</p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground font-semibold">Monto solicitado</span>
            <span className="font-bold">${monto.toLocaleString("es-MX")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground font-semibold">Plazo elegido</span>
            <span className="font-bold">{plazo} meses</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground font-semibold">Tasa de interés aprox.</span>
            <span className="font-bold text-warning">1.5% mensual</span>
          </div>
        </div>

        <div className="border-t border-border pt-4 mt-4 flex justify-between items-center">
          <span className="font-extrabold">Pago mensual</span>
          <span className="font-black text-primary text-2xl">
            ${pagoMensual.toLocaleString("es-MX")}
          </span>
        </div>
      </div>

      <button
        onClick={handleSolicitar}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary p-4 text-lg font-black text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50"
      >
        <Send className="h-5 w-5" />
        {busy ? "Procesando..." : "Solicitar ahora"}
      </button>
    </div>
  );
}
