import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Calculator, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNegocio } from "@/hooks/useNegocio";
import { calcularResumen, formatMXN, MESES_ES, type Movimiento } from "@/lib/fiscal";

const steps = [
  { question: "¿Cuánto vendiste este mes en total?", emoji: "💰", hint: "Si no estás seguro, pon un estimado", field: "ingresos" as const },
  { question: "¿Cuánto gastaste para tu negocio?", emoji: "🛒", hint: "Solo gastos con factura cuentan para IVA", field: "gastos" as const },
];

export default function Declaracion() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { negocio } = useNegocio();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ ingresos: "", gastos: "" });
  const [showResult, setShowResult] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (!negocio || prefilled) return;
    const start = new Date();
    start.setDate(1);
    supabase
      .from("transacciones")
      .select("tipo, monto, fecha, con_factura")
      .eq("negocio_id", negocio.id)
      .gte("fecha", start.toISOString().slice(0, 10))
      .then(({ data }) => {
        const arr = (data ?? []) as any[];
        const ing = arr.filter((t) => t.tipo === "INGRESO").reduce((s, t) => s + Number(t.monto), 0);
        const gas = arr.filter((t) => t.tipo === "GASTO").reduce((s, t) => s + Number(t.monto), 0);
        setValues({ ingresos: ing ? String(ing) : "", gastos: gas ? String(gas) : "" });
        setPrefilled(true);
      });
  }, [negocio, prefilled]);

  const currentStep = steps[step];

  // Tratamos los valores capturados como totales con IVA y con factura por defecto.
  const movs: Movimiento[] = [
    { tipo: "INGRESO", monto: parseFloat(values.ingresos) || 0, con_factura: true, fecha: new Date().toISOString().slice(0, 10) },
    { tipo: "GASTO", monto: parseFloat(values.gastos) || 0, con_factura: true, fecha: new Date().toISOString().slice(0, 10) },
  ];
  const r = calcularResumen(movs);

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }
    setShowResult(true);
    if (user && negocio) {
      const periodo = new Date().toISOString().slice(0, 7);
      await supabase.from("calculos_fiscales").insert({
        usuario_id: user.id,
        negocio_id: negocio.id,
        periodo,
        ingresos: r.ingresosTotal,
        gastos: r.gastosTotal,
        isr_estimado: r.isr,
        iva_estimado: Math.max(r.ivaAPagar, 0),
      });
    }
  };

  if (showResult) {
    const hoy = new Date();
    return (
      <div className="px-4 pt-6 space-y-6 animate-slide-up">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground font-semibold">
          <ArrowLeft className="h-5 w-5" /> Inicio
        </button>

        <div className="rounded-2xl bg-success-light p-6 text-center">
          <CheckCircle className="mx-auto h-14 w-14 text-success" />
          <h1 className="mt-3 text-2xl font-extrabold">¡Cálculo listo!</h1>
          <p className="text-muted-foreground">{MESES_ES[hoy.getMonth()]} {hoy.getFullYear()}</p>
        </div>

        <div className="space-y-3">
          <ResultRow label="Vendiste (con IVA)" value={r.ingresosTotal} />
          <ResultRow label="Base ingresos (sin IVA)" value={r.ingresosSubtotal} />
          <ResultRow label="Gastaste (con IVA)" value={r.gastosTotal} />
          <div className="border-t border-border" />
          <ResultRow label={`ISR RESICO (${(r.tasaISR * 100).toFixed(2)}%)`} value={r.isr} highlight />
          <ResultRow
            label={r.ivaAPagar < 0 ? "IVA a favor" : "IVA a pagar"}
            value={Math.abs(r.ivaAPagar)}
            highlight
          />
          <div className="border-t border-border" />
          <ResultRow label="Total a pagar" value={r.totalImpuestos} highlight />
        </div>

        <div className="rounded-xl bg-warning-light p-4 text-sm">
          <p className="font-bold text-warning">⚠️ Recuerda</p>
          <p className="text-muted-foreground mt-1">
            Este es un estimado. El IVA puede variar según tu actividad y facturación. Para tu declaración oficial,
            consulta con un contador o el SAT.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-6 animate-slide-up">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground font-semibold">
        <ArrowLeft className="h-5 w-5" /> Regresar
      </button>

      <div className="flex gap-2">
        {steps.map((_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <div className="rounded-2xl bg-muted p-6">
        <p className="text-4xl">{currentStep.emoji}</p>
        <h2 className="mt-3 text-xl font-extrabold">{currentStep.question}</h2>
        <p className="text-sm text-muted-foreground mt-1">{currentStep.hint}</p>
      </div>

      <div className="relative">
        <Calculator className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
        <input
          type="number"
          inputMode="decimal"
          placeholder="$0.00"
          value={values[currentStep.field]}
          onChange={(e) => setValues({ ...values, [currentStep.field]: e.target.value })}
          className="w-full rounded-xl border border-input bg-card p-4 pl-12 text-2xl font-bold outline-none ring-ring focus:ring-2"
        />
      </div>

      <button
        onClick={handleNext}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary p-4 text-lg font-bold text-primary-foreground shadow-md transition-all active:scale-[0.98]"
      >
        {step < steps.length - 1 ? "Siguiente" : "Calcular impuestos"}
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-card p-4">
      <span className={highlight ? "font-bold" : "text-muted-foreground"}>{label}</span>
      <span className={`font-bold ${highlight ? "text-primary text-lg" : ""}`}>
        {formatMXN(value)}
      </span>
    </div>
  );
}
