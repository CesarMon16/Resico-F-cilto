import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, DollarSign, FileText, Camera } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNegocio } from "@/hooks/useNegocio";

export default function Registrar() {
  const { tipo } = useParams<{ tipo: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { negocio, loading: negocioLoading } = useNegocio();
  const isIngreso = tipo === "ingreso";
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valor = parseFloat(monto);
    if (!valor || valor <= 0) {
      toast.error("Escribe cuánto fue");
      return;
    }
    if (!user || !negocio) {
      toast.error("Espera, estamos preparando tu negocio");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("transacciones").insert({
      usuario_id: user.id,
      negocio_id: negocio.id,
      tipo: isIngreso ? "INGRESO" : "GASTO",
      monto: valor,
      descripcion: descripcion || null,
      origen: "manual",
    });
    setBusy(false);
    if (error) {
      toast.error("No pudimos guardar tu información. Inténtalo nuevamente.");
      return;
    }
    void import("@/lib/auditoria").then((m) =>
      m.registrarAuditoria("TRANSACCION_CREADA", { tipo: isIngreso ? "INGRESO" : "GASTO", monto: valor }),
    );
    toast.success(
      isIngreso
        ? `¡Listo! Registraste una venta de $${valor.toLocaleString("es-MX")}`
        : `¡Listo! Registraste un gasto de $${valor.toLocaleString("es-MX")}`
    );
    navigate("/");
  };

  if (!negocioLoading && !negocio) return <Navigate to="/preparar-negocio" replace />;

  return (
    <div className="px-4 pt-6 space-y-6 animate-slide-up">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground font-semibold">
        <ArrowLeft className="h-5 w-5" />
        Regresar
      </button>

      <div className={`rounded-2xl p-6 ${isIngreso ? "bg-income-light" : "bg-expense-light"}`}>
        <h1 className={`text-2xl font-extrabold ${isIngreso ? "text-income" : "text-expense"}`}>
          {isIngreso ? "💰 ¿Cuánto vendiste?" : "🛒 ¿Cuánto gastaste?"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isIngreso ? "Registra lo que ganaste hoy" : "Registra lo que compraste o pagaste"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block font-bold">Cantidad</label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full rounded-xl border border-input bg-card p-4 pl-12 text-2xl font-bold outline-none ring-ring focus:ring-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block font-bold">¿De qué fue? (opcional)</label>
          <div className="relative">
            <FileText className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Ej: Venta del día, pago de luz..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full rounded-xl border border-input bg-card p-4 pl-12 text-base outline-none ring-ring focus:ring-2"
            />
          </div>
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Camera className="h-5 w-5" />
          <span className="font-semibold">Tomar foto del ticket</span>
        </button>

        <button
          type="submit"
          disabled={busy || negocioLoading || !negocio}
          className={`w-full rounded-xl p-4 text-lg font-bold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 ${
            isIngreso ? "bg-income text-primary-foreground" : "bg-expense text-primary-foreground"
          }`}
        >
          {busy ? "Guardando..." : negocioLoading || !negocio ? "Preparando..." : isIngreso ? "Registrar venta" : "Registrar gasto"}
        </button>
      </form>
    </div>
  );
}
