import { useEffect, useState } from "react";
import { Send, Info, Calculator, TrendingUp, ChevronRight, Store, ShoppingBag, Truck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { solicitarCredito } from "@/services/creditos.service";
import { handleError } from "@/lib/errors";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { SpinnerInline } from "@/components/SkeletonCard";

const PROPOSITOS = [
  { id: "mercancia", label: "Comprar mercancía", icon: <ShoppingBag className="h-6 w-6" />, desc: "Para surtir mi negocio" },
  { id: "local", label: "Mejorar mi local", icon: <Store className="h-6 w-6" />, desc: "Renta o remodelación" },
  { id: "equipo", label: "Equipo o Maquinaria", icon: <Truck className="h-6 w-6" />, desc: "Herramientas de trabajo" },
  { id: "otros", label: "Otros gastos", icon: <Info className="h-6 w-6" />, desc: "Gastos operativos" },
];

export default function Creditos() {
  const { user } = useAuth();
  const [paso, setPaso] = useState(1);
  const [monto, setMonto] = useState<number>(10000);
  const [plazo, setPlazo] = useState<number>(12);
  const [proposito, setProposito] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [limiteMaximo, setLimiteMaximo] = useState<number>(5000);
  const [nombreUsuario, setNombreUsuario] = useState("");

  useEffect(() => {
    if (!user) return;
    async function cargarDatos() {
      try {
        const { data: profile } = await supabase.from("profiles").select("nombre").eq("id", user.id).single();
        if (profile) setNombreUsuario(profile.nombre.split(" ")[0]);

        const { data: txs } = await supabase
          .from("transacciones")
          .select("monto")
          .eq("usuario_id", user.id)
          .eq("tipo", "INGRESO");

        const ingresosTotales = (txs ?? []).reduce((acc, curr) => acc + Number(curr.monto), 0);
        const maxCalculado = Math.max(5000, Math.min(100000, ingresosTotales * 2));
        const maxRedondeado = Math.round(maxCalculado / 1000) * 1000;
        
        setLimiteMaximo(maxRedondeado);
        setMonto(Math.min(10000, maxRedondeado));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDatos(false);
      }
    }
    cargarDatos();
  }, [user]);

  const handleSolicitar = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await solicitarCredito(user.id, monto, plazo, proposito);
      setPaso(4); // Paso de éxito
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const interesMensual = 0.015;
  const montoTotal = monto * (1 + (interesMensual * plazo));
  const pagoMensual = Math.round(montoTotal / plazo);

  if (loadingDatos) return <div className="p-20 text-center"><SpinnerInline /></div>;

  return (
    <div className="px-4 pt-6 space-y-6 pb-24 animate-in fade-in duration-500">
      
      {/* Indicador de pasos */}
      {paso < 4 && (
        <div className="flex gap-1 mb-2">
          {[1, 2, 3].map((p) => (
            <div key={p} className={`h-1.5 flex-1 rounded-full transition-all ${paso >= p ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      )}

      {/* PASO 1: BIENVENIDA */}
      {paso === 1 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black leading-tight">¡Hola {nombreUsuario}! 👋</h1>
            <p className="text-lg text-muted-foreground">Tus ventas registradas te han abierto una oportunidad.</p>
          </div>

          <div className="rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
            <TrendingUp className="absolute -right-4 -bottom-4 h-32 w-32 opacity-10" />
            <p className="text-sm font-bold uppercase tracking-wider opacity-80">Crédito pre-aprobado</p>
            <h2 className="text-4xl font-black mt-2">${limiteMaximo.toLocaleString("es-MX")}</h2>
            <p className="text-sm mt-4 leading-relaxed">Este monto es una estimación basada en tu historial de ventas actual.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-muted/50">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Este crédito es parte del programa de <b>Apoyos a Microempresas</b>. Sin trámites complejos ni avales.
              </p>
            </div>
            
            <button
              onClick={() => setPaso(2)}
              className="w-full bg-primary text-primary-foreground p-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
            >
              Simular mi crédito <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: SIMULADOR */}
      {paso === 2 && (
        <div className="space-y-8 animate-in slide-in-from-right duration-300">
          <button onClick={() => setPaso(1)} className="flex items-center gap-2 text-muted-foreground font-bold text-sm">
            <ArrowLeft className="h-4 w-4" /> Regresar
          </button>

          <div className="space-y-2">
            <h2 className="text-2xl font-black">¿Cuánto necesitas?</h2>
            <p className="text-muted-foreground">Usa el control para elegir el monto.</p>
          </div>

          <div className="space-y-6">
            <div className="text-center p-6 bg-card border rounded-[2rem] shadow-sm">
              <span className="text-5xl font-black text-primary">${monto.toLocaleString("es-MX")}</span>
              <Slider
                value={[monto]}
                onValueChange={(vals) => setMonto(vals[0])}
                max={limiteMaximo}
                min={1000}
                step={1000}
                className="mt-8 mb-4"
              />
              <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground">
                <span>$1,000</span>
                <span>Max: ${limiteMaximo.toLocaleString("es-MX")}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground px-1">Plazo de pago</h3>
              <div className="grid grid-cols-2 gap-3">
                {[6, 12, 18, 24].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlazo(p)}
                    className={`p-4 rounded-2xl border-2 font-black transition-all ${
                      plazo === p ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {p} meses
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3 mb-2">
                <Calculator className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">Resumen de tu apoyo</h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-semibold">Costo mensual (Interés)</span>
                  <span className="font-bold text-success">1.5%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-semibold">Total de intereses</span>
                  <span className="font-bold text-warning">${(montoTotal - monto).toLocaleString("es-MX")}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-border">
                  <span className="font-black text-foreground">Total a pagar</span>
                  <span className="font-black text-xl text-foreground">${Math.round(montoTotal).toLocaleString("es-MX")}</span>
                </div>
              </div>

              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex justify-between items-center mt-2">
                <div>
                  <p className="text-[10px] font-black uppercase text-primary/70">Tu pago cada mes</p>
                  <p className="text-3xl font-black text-primary">${pagoMensual.toLocaleString("es-MX")}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary/30" />
              </div>
            </div>

            <button
              onClick={() => setPaso(3)}
              className="w-full bg-primary text-primary-foreground p-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
            >
              Continuar <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: PROPÓSITO */}
      {paso === 3 && (
        <div className="space-y-8 animate-in slide-in-from-right duration-300">
          <button onClick={() => setPaso(2)} className="flex items-center gap-2 text-muted-foreground font-bold text-sm">
            <ArrowLeft className="h-4 w-4" /> Regresar
          </button>

          <div className="space-y-2">
            <h2 className="text-2xl font-black">¿En qué invertirás?</h2>
            <p className="text-muted-foreground">Ayúdanos a entender el destino de tu apoyo.</p>
          </div>

          <div className="grid gap-3">
            {PROPOSITOS.map((p) => (
              <button
                key={p.id}
                onClick={() => setProposito(p.id)}
                className={`flex items-center gap-4 p-5 rounded-[1.5rem] border-2 text-left transition-all ${
                  proposito === p.id ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className={`p-3 rounded-xl ${proposito === p.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {p.icon}
                </div>
                <div>
                  <p className="font-bold">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handleSolicitar}
            disabled={!proposito || busy}
            className="w-full bg-primary text-primary-foreground p-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 transition-transform"
          >
            {busy ? "Enviando..." : "Finalizar solicitud"}
          </button>
        </div>
      )}

      {/* PASO 4: ÉXITO */}
      {paso === 4 && (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-6 animate-in zoom-in duration-500">
          <div className="h-24 w-24 bg-success/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-16 w-16 text-success" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black">¡Solicitud Enviada!</h2>
            <p className="text-muted-foreground px-4">
              Hemos recibido tu solicitud por <b>${monto.toLocaleString("es-MX")}</b>. Un asesor revisará tu historial de ventas y te contactará.
            </p>
          </div>
          <button
            onClick={() => window.location.href = "/"}
            className="w-full max-w-xs bg-muted p-4 rounded-2xl font-bold text-muted-foreground"
          >
            Regresar al inicio
          </button>
        </div>
      )}

    </div>
  );
}
