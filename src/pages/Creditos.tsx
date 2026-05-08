import { useState } from "react";
import { ArrowLeft, Landmark, Info, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function Creditos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [monto, setMonto] = useState(5000);
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  // Simulación de cálculo de intereses (1.5% mensual para microcrédito)
  const interes = monto * 0.015;
  const totalAPagar = monto + (interes * 12); // a 12 meses
  const pagoMensual = totalAPagar / 12;

  const solicitarCredito = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No hay sesión activa");

      const { error } = await supabase
        .from('creditos')
        .insert({
          usuario_id: user.id,
          monto_solicitado: monto,
          estatus: 'pendiente',
          fecha_solicitud: new Date().toISOString()
        });

      if (error) throw error;

      setEnviado(true);
      toast({ title: "Solicitud enviada", description: "Un asesor revisará tu perfil." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="px-4 h-[80vh] flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
        <div className="h-20 w-20 bg-success/10 text-success rounded-full flex items-center justify-center mb-4">
          <CheckCircle size={48} />
        </div>
        <h1 className="text-2xl font-black">¡Solicitud Recibida!</h1>
        <p className="text-muted-foreground">Estamos analizando tus ventas para aprobar tu crédito de <strong>${monto.toLocaleString()}</strong>.</p>
        <Button onClick={() => navigate("/")} className="w-full max-w-xs mt-6">Volver al inicio</Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-extrabold">Créditos</h1>
      </div>

      <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Landmark className="text-primary h-6 w-6" />
          <h2 className="font-bold text-lg">Simulador de apoyo</h2>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">¿Cuánto necesitas?</label>
              <span className="text-3xl font-black text-primary">${monto.toLocaleString()}</span>
            </div>
            <input 
              type="range" 
              min="1000" 
              max="50000" 
              step="1000"
              value={monto}
              onChange={(e) => setMonto(parseInt(e.target.value))}
              className="w-full h-3 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
              <span>$1,000</span>
              <span>$50,000</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-dashed border-primary/20">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pago mensual</p>
              <p className="text-xl font-black">${pagoMensual.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Plazo</p>
              <p className="text-xl font-black">12 meses</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 text-blue-700 text-xs mb-8">
        <Info className="shrink-0 h-5 w-5" />
        <p>Tu buen historial de ventas registradas en esta app aumenta tus posibilidades de aprobación.</p>
      </div>

      <Button 
        onClick={solicitarCredito} 
        disabled={loading}
        className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20"
      >
        {loading ? "Procesando..." : "Solicitar crédito ahora"}
      </Button>
    </div>
  );
}
