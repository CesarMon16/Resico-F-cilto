import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, FileText, Camera, Calendar } from "lucide-react";
import { useTransactionRegistration } from "@/hooks/useTransactionRegistration";

export default function Registrar() {
  const { tipo } = useParams<{ tipo: string }>();
  const navigate = useNavigate();
  const isIngreso = tipo === "ingreso";

  const {
    monto, setMonto,
    descripcion, setDescripcion,
    fecha, setFecha,
    busy,
    handleSubmit
  } = useTransactionRegistration({ isIngreso });

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
              step="0.01"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full rounded-xl border border-input bg-card p-4 pl-12 text-2xl font-bold outline-none ring-ring focus:ring-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block font-bold">Fecha</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-xl border border-input bg-card p-4 pl-12 text-base outline-none ring-ring focus:ring-2 [&::-webkit-calendar-picker-indicator]:opacity-50"
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
          disabled={busy}
          className={`w-full rounded-xl p-4 text-lg font-bold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 ${
            isIngreso ? "bg-income text-primary-foreground" : "bg-expense text-primary-foreground"
          }`}
        >
          {busy ? "Guardando..." : isIngreso ? "Registrar venta" : "Registrar gasto"}
        </button>
      </form>
    </div>
  );
}
