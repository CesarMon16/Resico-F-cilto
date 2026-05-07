import { useState } from "react";
import { ArrowLeft, ArrowRight, Calculator, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mockSummary } from "@/lib/mockData";

const steps = [
  {
    question: "¿Cuánto vendiste este mes en total?",
    emoji: "💰",
    hint: "Si no estás seguro, pon un estimado",
    field: "ingresos",
  },
  {
    question: "¿Cuánto gastaste para tu negocio?",
    emoji: "🛒",
    hint: "Incluye renta, mercancía, servicios...",
    field: "gastos",
  },
];

export default function Declaracion() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ ingresos: "", gastos: "" });
  const [showResult, setShowResult] = useState(false);

  const currentStep = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setShowResult(true);
    }
  };

  const ingresos = parseFloat(values.ingresos) || mockSummary.ingresos;
  const gastos = parseFloat(values.gastos) || mockSummary.gastos;
  const base = Math.max(ingresos - gastos, 0);
  const isrEstimado = Math.round(base * 0.0125 * 100) / 100; // RESICO ~1.25%
  const ivaEstimado = Math.round(ingresos * 0.16 * 100) / 100;

  if (showResult) {
    return (
      <div className="px-4 pt-6 space-y-6 animate-slide-up">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground font-semibold">
          <ArrowLeft className="h-5 w-5" /> Inicio
        </button>

        <div className="rounded-2xl bg-success-light p-6 text-center">
          <CheckCircle className="mx-auto h-14 w-14 text-success" />
          <h1 className="mt-3 text-2xl font-extrabold">¡Cálculo listo!</h1>
          <p className="text-muted-foreground">Esto es un estimado para que sepas cuánto pagarías</p>
        </div>

        <div className="space-y-3">
          <ResultRow label="Vendiste" value={ingresos} />
          <ResultRow label="Gastaste" value={gastos} />
          <div className="border-t border-border" />
          <ResultRow label="ISR estimado (RESICO)" value={isrEstimado} highlight />
          <ResultRow label="IVA estimado" value={ivaEstimado} highlight />
        </div>

        <div className="rounded-xl bg-warning-light p-4 text-sm">
          <p className="font-bold text-warning">⚠️ Recuerda</p>
          <p className="text-muted-foreground mt-1">
            Este es solo un estimado. Para tu declaración oficial, consulta con un contador o el SAT.
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

      {/* Progress */}
      <div className="flex gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-primary" : "bg-muted"
            }`}
          />
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
          value={values[currentStep.field as keyof typeof values]}
          onChange={(e) =>
            setValues({ ...values, [currentStep.field]: e.target.value })
          }
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

function ResultRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-card p-4">
      <span className={highlight ? "font-bold" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={`font-bold ${highlight ? "text-primary text-lg" : ""}`}>
        ${value.toLocaleString("es-MX")}
      </span>
    </div>
  );
}
