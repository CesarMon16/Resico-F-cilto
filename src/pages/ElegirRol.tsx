import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ElegirRol() {
  const nav = useNavigate();
  const [loading, setLoading] = useState<"USUARIO" | "CONTADOR" | null>(null);

  async function elegir(rol: "USUARIO" | "CONTADOR") {
    setLoading(rol);
    const { error } = await supabase.rpc("asignar_rol_inicial", { _role: rol });
    if (error) {
      setLoading(null);
      toast.error("No se pudo guardar tu elección. Intenta de nuevo.");
      return;
    }
    // Recarga completa para que useUserRole y OnboardingGate vean el rol nuevo
    window.location.assign(rol === "CONTADOR" ? "/onboarding-contador" : "/preparar-negocio");
  }
  void nav;

  return (
    <div className="px-4 pt-10 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-extrabold">¿Cómo usarás la app? 👋</h1>
        <p className="text-muted-foreground">Elige una opción para empezar</p>
      </div>

      <button
        onClick={() => elegir("USUARIO")}
        disabled={loading !== null}
        className="w-full rounded-2xl border-2 border-border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-md disabled:opacity-50"
      >
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-success-light p-4">
            <Store className="h-8 w-8 text-success" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-extrabold">Comenzar a registrar mi actividad 🛒</p>
            <p className="text-sm text-muted-foreground">
              Tengo un negocio y quiero llevar mis cuentas e impuestos.
            </p>
          </div>
        </div>
      </button>

      <button
        onClick={() => elegir("CONTADOR")}
        disabled={loading !== null}
        className="w-full rounded-2xl border-2 border-border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-md disabled:opacity-50"
      >
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-primary/10 p-4">
            <Calculator className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-extrabold">Soy contador 🧮</p>
            <p className="text-sm text-muted-foreground">
              Apoyo a varios clientes con su contabilidad e impuestos.
            </p>
          </div>
        </div>
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Esta elección define tu experiencia. Si te equivocas, escríbenos.
      </p>
    </div>
  );
}
