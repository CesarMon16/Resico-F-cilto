<<<<<<< HEAD
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
=======
import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNegocio } from "@/hooks/useNegocio";
import { useResumenMes } from "@/hooks/useResumenMes";
import {
  calcularResumen,
  formatMXN,
  MESES_ES,
  type Movimiento,
  type ResumenFiscal,
} from "@/lib/fiscal";
import { EmptyState } from "@/components/EmptyState";
import { SpinnerInline } from "@/components/SkeletonCard";
import { guardarCalculoFiscal } from "@/services/fiscal.service";
import { handleError } from "@/lib/errors";

const HOY = new Date();

/* ─── Tipos locales ─────────────────────────────────────────────── */
type MovLocal = Movimiento & { id: string; descripcion?: string | null };

/* ─── Helpers ───────────────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2);
}

/* ─── Componente fila editable ──────────────────────────────────── */
function FilaMovimiento({
  mov,
  onUpdate,
  onDelete,
  color,
}: {
  mov: MovLocal;
  onUpdate: (id: string, monto: number) => void;
  onDelete: (id: string) => void;
  color: "green" | "red";
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(mov.monto));
  const [error, setError] = useState("");

  const validarValor = (v: string): string => {
    const n = parseFloat(v.replace(/,/g, ""));
    if (!v.trim()) return "El monto es obligatorio.";
    if (isNaN(n) || !isFinite(n)) return "Ingresa un número válido.";
    if (n <= 0) return "Debe ser mayor a $0.";
    if (n < 0.01) return "Mínimo $0.01.";
    if (n > 3_500_000) return "Excede el límite RESICO.";
    return "";
  };

  const confirmar = () => {
    const err = validarValor(valor);
    if (err) { setError(err); return; }
    const n = parseFloat(valor.replace(/,/g, ""));
    onUpdate(mov.id, n);
    setError("");
    setEditando(false);
  };

  const ring = color === "green" ? "focus:ring-green-400" : "focus:ring-rose-400";
  const badge =
    color === "green"
      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
      : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";

  /* fila con monto inválido (ej: recién agregada con monto=0) */
  const invalida = !editando && (mov.monto <= 0 || !isFinite(mov.monto));

  return (
    <div
      className={`rounded-xl border bg-card p-3 transition-all ${
        invalida ? "border-destructive bg-destructive/5" : "border-border"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* descripción */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">
            {mov.descripcion || (mov.tipo === "INGRESO" ? "Venta" : "Gasto")}
          </p>
          {editando ? (
            <div className="space-y-1 mt-1">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-muted-foreground">$</span>
                <input
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  max={3500000}
                  step="0.01"
                  value={valor}
                  onChange={(e) => { setValor(e.target.value); setError(""); }}
                  onBlur={confirmar}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmar();
                    if (e.key === "Escape") {
                      setValor(String(mov.monto));
                      setError("");
                      setEditando(false);
                    }
                  }}
                  className={`w-28 rounded-lg border px-2 py-1 text-sm font-bold outline-none focus:ring-2 bg-background ${
                    error ? "border-destructive focus:ring-destructive/40" : `border-input ${ring}`
                  }`}
                />
                <button onClick={confirmar} className="rounded-lg bg-primary p-1 text-primary-foreground">
                  <Check className="h-3 w-3" />
                </button>
                <button
                  onClick={() => { setValor(String(mov.monto)); setError(""); setEditando(false); }}
                  className="rounded-lg bg-muted p-1 text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {error && <p className="text-[10px] text-destructive font-semibold">⚠️ {error}</p>}
            </div>
          ) : (
            <p className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-sm font-bold ${badge}`}>
              {mov.monto <= 0 ? (
                <span className="text-destructive">⚠️ Monto requerido</span>
              ) : (
                formatMXN(mov.monto)
              )}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {mov.fecha} · {mov.con_factura ? "Con factura ✅" : "Sin factura"}
          </p>
        </div>

        {/* acciones */}
        <div className="flex gap-1 shrink-0">
          {!editando && (
            <button
              onClick={() => setEditando(true)}
              className="rounded-lg p-2 hover:bg-muted transition-colors"
              title="Editar monto"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={() => onDelete(mov.id)}
            className="rounded-lg p-2 hover:bg-destructive/10 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sección de reporte descriptivo ───────────────────────────── */
function ReporteDescriptivo({ r, periodo }: { r: ResumenFiscal; periodo: string }) {
  const tasaPct = (r.tasaISR * 100).toFixed(2);

  /* bloques explicativos */
  const bloques: { emoji: string; titulo: string; texto: string; color: string }[] = [];

  /* 1. Ingresos */
  bloques.push({
    emoji: "💰",
    titulo: "Lo que ganaste (tus ventas)",
    texto: `En ${periodo} cobraste un total de ${formatMXN(r.ingresosTotal)}. De ese total, ${formatMXN(r.ingresosSubtotal)} es lo que realmente ganaste (sin IVA) y ${formatMXN(r.ivaCobrado)} es el IVA que cobrastes de más para dárselo al gobierno más tarde.`,
    color: "border-l-green-400 bg-green-50 dark:bg-green-900/10",
  });

  /* 2. Gastos */
  if (r.gastosTotal > 0) {
    bloques.push({
      emoji: "🧾",
      titulo: "Lo que gastaste (tus compras)",
      texto: `Gastaste ${formatMXN(r.gastosTotal)} en compras para tu negocio. De eso, ${formatMXN(r.ivaAcreditable)} corresponden a IVA de compras con factura, lo cual te ayuda a pagar menos IVA.${
        r.gastosTotal - r.ivaAcreditable > 0
          ? ` El resto (${formatMXN(r.gastosSubtotal)}) son tus costos reales.`
          : ""
      }`,
      color: "border-l-orange-400 bg-orange-50 dark:bg-orange-900/10",
    });
  }

  /* 3. ISR */
  bloques.push({
    emoji: "📊",
    titulo: "ISR — el impuesto sobre tus ventas",
    texto:
      r.ingresosTotal === 0
        ? "No tuviste ventas, así que no hay ISR que pagar. ¡Igual súbele a las ventas! 😄"
        : `El ISR funciona así: el SAT dice "de todo lo que vendiste (${formatMXN(r.ingresosSubtotal)} sin IVA), dame el ${tasaPct}%". Eso da ${formatMXN(r.isr)}. Esa tasa tan pequeña es una ventaja de estar en RESICO.`,
    color: "border-l-blue-400 bg-blue-50 dark:bg-blue-900/10",
  });

  /* 4. IVA */
  const ivaTexto =
    r.ivaAPagar < 0
      ? `Pagaste más IVA del que cobraste. El gobierno te debe ${formatMXN(Math.abs(r.ivaAPagar))}. Eso se llama "saldo a favor". Puedes usarlo para compensar futuros pagos.`
      : r.ivaAPagar === 0
      ? "El IVA que cobraste a tus clientes es exactamente igual al que pagaste en compras. Estás a mano con el gobierno, no debes nada de IVA. 🤝"
      : `Cobraste ${formatMXN(r.ivaCobrado)} de IVA a tus clientes. Luego pagaste ${formatMXN(r.ivaAcreditable)} de IVA en compras con factura. La diferencia (${formatMXN(r.ivaAPagar)}) es lo que tienes que entregar al SAT.`;

  bloques.push({
    emoji: "🏷️",
    titulo: "IVA — el impuesto al consumo",
    texto: ivaTexto,
    color: "border-l-purple-400 bg-purple-50 dark:bg-purple-900/10",
  });

  /* 5. Total */
  bloques.push({
    emoji: "🧮",
    titulo: "¿Cuánto tienes que pagar en total?",
    texto: `ISR (${formatMXN(r.isr)}) + IVA a pagar (${formatMXN(Math.max(r.ivaAPagar, 0))}) = ${formatMXN(r.totalImpuestos)}. Eso es lo que deberías apartar para tu declaración de ${periodo}.`,
    color: "border-l-primary bg-primary/5",
  });

  return (
    <div className="space-y-3">
      {bloques.map((b) => (
        <div
          key={b.titulo}
          className={`rounded-2xl border-l-4 p-4 ${b.color}`}
        >
          <p className="font-extrabold text-sm mb-1">
            {b.emoji} {b.titulo}
          </p>
          <p className="text-sm leading-relaxed text-foreground/80">{b.texto}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────── */
export default function Declaracion() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { negocio } = useNegocio();
  const [paso, setPaso] = useState(0);
  const [mes, setMes] = useState(() => {
    const p = searchParams.get("mes");
    return p ? Number(p) : HOY.getMonth() + 1;
  });
  const [anio, setAnio] = useState(() => {
    const p = searchParams.get("anio");
    return p ? Number(p) : HOY.getFullYear();
  });
  const [guardando, setGuardando] = useState(false);

  /* datos remotos */
  const { movs: movsRemotos, loading } = useResumenMes(mes, anio);

  /* copias locales editables */
  const [ingresos, setIngresos] = useState<MovLocal[]>([]);
  const [gastos, setGastos] = useState<MovLocal[]>([]);

  /* sincronizar cuando cambian los datos remotos o el periodo */
  useEffect(() => {
    setIngresos(
      (movsRemotos as MovLocal[]).filter((m) => m.tipo === "INGRESO")
    );
    setGastos(
      (movsRemotos as MovLocal[]).filter((m) => m.tipo === "GASTO")
    );
  }, [movsRemotos]);

  /* resumen recalculado en tiempo real con datos editados */
  const resumen = useMemo<ResumenFiscal>(() => {
    return calcularResumen([...ingresos, ...gastos]);
  }, [ingresos, gastos]);

  const periodo = `${MESES_ES[mes - 1]} ${anio}`;

  /* helpers de edición */
  const actualizarIngreso = (id: string, monto: number) =>
    setIngresos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, monto } : m))
    );
  const eliminarIngreso = (id: string) =>
    setIngresos((prev) => prev.filter((m) => m.id !== id));
  const agregarIngreso = () =>
    setIngresos((prev) => [
      ...prev,
      {
        id: uid(),
        tipo: "INGRESO",
        monto: 0,
        fecha: `${anio}-${String(mes).padStart(2, "0")}-${String(HOY.getDate()).padStart(2, "0")}`,
        con_factura: true,
        descripcion: "Nueva venta",
      },
    ]);

  const actualizarGasto = (id: string, monto: number) =>
    setGastos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, monto } : m))
    );
  const eliminarGasto = (id: string) =>
    setGastos((prev) => prev.filter((m) => m.id !== id));
  const agregarGasto = () =>
    setGastos((prev) => [
      ...prev,
      {
        id: uid(),
        tipo: "GASTO",
        monto: 0,
        fecha: `${anio}-${String(mes).padStart(2, "0")}-${String(HOY.getDate()).padStart(2, "0")}`,
        con_factura: true,
        descripcion: "Nueva compra",
      },
    ]);

  /* validación de pasos */
  const ingresosInvalidos = ingresos.filter((m) => m.monto <= 0 || !isFinite(m.monto));
  const gastosInvalidos   = gastos.filter((m) => m.monto <= 0 || !isFinite(m.monto));

  const avanzarPaso1 = () => {
    if (ingresosInvalidos.length > 0) {
      toast.error(`Corrige ${ingresosInvalidos.length} venta(s) con monto inválido antes de continuar.`);
      return;
    }
    setPaso(2);
  };

  const avanzarPaso2 = () => {
    if (gastosInvalidos.length > 0) {
      toast.error(`Corrige ${gastosInvalidos.length} compra(s) con monto inválido antes de continuar.`);
      return;
    }
    setPaso(3);
  };

  /* guardar */
  const guardar = async () => {
    if (!user || !negocio) return;
    setGuardando(true);
    try {
      await guardarCalculoFiscal({
        usuario_id: user.id,
        negocio_id: negocio.id,
        mes,
        anio,
        resumen,
      });
      toast.success("Cálculo guardado en tu historial 🎉");
      navigate("/historial-fiscal");
    } catch (err) {
      handleError(err);
    } finally {
      setGuardando(false);
    }
  };

  /* ── Header con progreso ── */
  const Header = (
    <div className="flex items-center justify-between">
      <button
        onClick={() =>
          paso === 0 ? navigate(-1) : setPaso((p) => p - 1)
        }
        className="flex items-center gap-2 text-muted-foreground font-semibold"
      >
        <ArrowLeft className="h-5 w-5" /> Atrás
      </button>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-2 w-6 rounded-full transition-colors ${
              i <= paso ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );

  /* ── PASO 0: elegir periodo ── */
  const Paso0 = (
    <div className="space-y-5">
      <div>
        <p className="text-3xl">👋</p>
        <h1 className="text-2xl font-extrabold mt-2">
          Vamos a revisar tus impuestos
        </h1>
        <p className="text-muted-foreground mt-1">
          Te mostraré cuánto cobraste, cuánto gastaste y cuánto le debes al
          SAT. ¡Paso a paso y en lenguaje sencillo!
        </p>
      </div>
      <label className="block">
        <p className="font-bold mb-2">¿Qué mes quieres revisar?</p>
        <div className="flex gap-2">
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="flex-1 rounded-xl border border-input bg-card p-4 text-base font-semibold outline-none focus:ring-2 ring-ring"
          >
            {MESES_ES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="rounded-xl border border-input bg-card p-4 text-base font-semibold outline-none focus:ring-2 ring-ring"
          >
            {[HOY.getFullYear() - 1, HOY.getFullYear()].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </label>
      <button
        onClick={() => setPaso(1)}
        className="w-full rounded-2xl bg-primary p-4 text-primary-foreground font-bold text-base flex items-center justify-center gap-2 active:scale-[0.99]"
      >
        Empezar <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );

  /* ── PASO 1: Ingresos editables ── */
  const Paso1 = (
    <div className="space-y-5">
      <div>
        <div className="rounded-full bg-green-100 dark:bg-green-900/30 w-12 h-12 flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-green-600" />
        </div>
        <h1 className="text-2xl font-extrabold mt-3">
          Tus ventas en {periodo}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Aquí están las ventas que registraste. Si falta alguna o hay un
          error, puedes editarlas o agregar nuevas antes de calcular.
        </p>
      </div>

      {loading ? (
        <SpinnerInline />
      ) : (
        <>
          {ingresos.length === 0 ? (
            <EmptyState
              emoji="💸"
              title="No hay ventas registradas"
              description={`No encontramos ventas en ${periodo}. Puedes agregar una manualmente.`}
            />
          ) : (
            <div className="space-y-2">
              {ingresos.map((m) => (
                <FilaMovimiento
                  key={m.id}
                  mov={m}
                  onUpdate={actualizarIngreso}
                  onDelete={eliminarIngreso}
                  color="green"
                />
              ))}
            </div>
          )}

          {/* total en tiempo real */}
          {ingresos.length > 0 && (
            <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 flex justify-between items-center">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                Total cobrado
              </p>
              <p className="text-xl font-extrabold text-green-700 dark:text-green-400">
                {formatMXN(resumen.ingresosTotal)}
              </p>
            </div>
          )}

          <button
            onClick={agregarIngreso}
            className="w-full rounded-2xl border-2 border-dashed border-green-300 dark:border-green-700 p-3 text-green-700 dark:text-green-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
          >
            <Plus className="h-4 w-4" /> Agregar venta manualmente
          </button>
        </>
      )}

      {ingresosInvalidos.length > 0 && (
        <p className="text-xs text-center text-destructive font-semibold animate-pulse">
          ⚠️ {ingresosInvalidos.length} venta(s) tienen monto en $0. Edítalas antes de continuar.
        </p>
      )}
      <button
        onClick={avanzarPaso1}
        className="w-full rounded-2xl bg-primary p-4 text-primary-foreground font-bold text-base flex items-center justify-center gap-2"
      >
        Confirmar ventas <Check className="h-5 w-5" />
      </button>
    </div>
  );

  /* ── PASO 2: Gastos editables ── */
  const Paso2 = (
    <div className="space-y-5">
      <div>
        <div className="rounded-full bg-rose-100 dark:bg-rose-900/30 w-12 h-12 flex items-center justify-center">
          <TrendingDown className="h-6 w-6 text-rose-600" />
        </div>
        <h1 className="text-2xl font-extrabold mt-3">
          Tus compras en {periodo}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Solo las compras con factura ayudan a reducir tu IVA. Revisa que
          todo esté correcto.
        </p>
      </div>

      {loading ? (
        <SpinnerInline />
      ) : (
        <>
          {gastos.length === 0 ? (
            <EmptyState
              emoji="🧾"
              title="Sin compras registradas"
              description={`No encontramos gastos en ${periodo}. Puedes agregar uno manualmente.`}
            />
          ) : (
            <div className="space-y-2">
              {gastos.map((m) => (
                <FilaMovimiento
                  key={m.id}
                  mov={m}
                  onUpdate={actualizarGasto}
                  onDelete={eliminarGasto}
                  color="red"
                />
              ))}
            </div>
          )}

          {/* total en tiempo real */}
          {gastos.length > 0 && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 space-y-1">
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">
                  Total gastado
                </p>
                <p className="text-xl font-extrabold text-rose-700 dark:text-rose-400">
                  {formatMXN(resumen.gastosTotal)}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  IVA acreditable (con factura)
                </p>
                <p className="text-xs font-bold text-muted-foreground">
                  {formatMXN(resumen.ivaAcreditable)}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={agregarGasto}
            className="w-full rounded-2xl border-2 border-dashed border-rose-300 dark:border-rose-700 p-3 text-rose-700 dark:text-rose-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            <Plus className="h-4 w-4" /> Agregar compra manualmente
          </button>
        </>
      )}

      {gastosInvalidos.length > 0 && (
        <p className="text-xs text-center text-destructive font-semibold animate-pulse">
          ⚠️ {gastosInvalidos.length} compra(s) tienen monto en $0. Edítalas antes de continuar.
        </p>
      )}
      <button
        onClick={avanzarPaso2}
        className="w-full rounded-2xl bg-primary p-4 text-primary-foreground font-bold text-base flex items-center justify-center gap-2"
      >
        Ver mi reporte <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );

  /* ── PASO 3: Reporte descriptivo ── */
  const Paso3 = (
    <div className="space-y-5">
      <div>
        <div className="rounded-full bg-primary/15 w-12 h-12 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-extrabold mt-3">
          Tu reporte de {periodo}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Te explico todo paso a paso, como si nunca hubieras pagado impuestos.
        </p>
      </div>

      {/* Tarjeta total destacado */}
      <div className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-lg">
        <p className="text-sm opacity-75">Total estimado a pagar al SAT</p>
        <p className="text-4xl font-extrabold mt-1">
          {formatMXN(resumen.totalImpuestos)}
        </p>
        <p className="text-xs opacity-60 mt-1">
          ISR ({formatMXN(resumen.isr)}) + IVA a pagar ({formatMXN(Math.max(resumen.ivaAPagar, 0))})
        </p>
      </div>

      {/* Grid de métricas con descripción */}
      <div className="grid grid-cols-2 gap-3">

        {/* Utilidad */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-1 col-span-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Utilidad</p>
          <p className="text-2xl font-extrabold">{formatMXN(resumen.utilidad)}</p>
          <p className="text-[11px] font-mono text-primary/80 bg-primary/5 rounded-lg px-2 py-1">
            Ventas sin IVA ({formatMXN(resumen.ingresosSubtotal)}) − Compras sin IVA ({formatMXN(resumen.gastosSubtotal)})
          </p>
          <p className="text-xs text-muted-foreground">Lo que queda de tus ventas después de restar lo que gastaste (ambos sin IVA).</p>
        </div>

        {/* ISR */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ISR RESICO ({(resumen.tasaISR * 100).toFixed(2)}%)</p>
          <p className="text-xl font-extrabold">{formatMXN(resumen.isr)}</p>
          <p className="text-[11px] font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2 py-1">
            Ventas sin IVA × {(resumen.tasaISR * 100).toFixed(2)}%
          </p>
          <p className="text-xs text-muted-foreground">El SAT te cobra un % de todo lo que vendiste (sin IVA). En RESICO la tasa es muy baja.</p>
        </div>

        {/* IVA a pagar */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">IVA a pagar</p>
          <p className={`text-xl font-extrabold ${resumen.ivaAPagar < 0 ? "text-green-600" : ""}`}>
            {formatMXN(resumen.ivaAPagar)}
          </p>
          <p className="text-[11px] font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-2 py-1">
            IVA cobrado − IVA acreditable
          </p>
          <p className="text-xs text-muted-foreground">
            {resumen.ivaAPagar < 0
              ? "Pagaste más IVA del que cobraste — tienes saldo a favor 🎉"
              : "Lo que cobraste de IVA a tus clientes menos lo que pagaste en compras con factura."}
          </p>
        </div>

        {/* IVA cobrado */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">IVA cobrado</p>
          <p className="text-xl font-extrabold">{formatMXN(resumen.ivaCobrado)}</p>
          <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-2 py-1">
            Suma del 16% de tus ventas con factura
          </p>
          <p className="text-xs text-muted-foreground">El IVA que tus clientes te pagaron y que debes entregar al SAT.</p>
        </div>

        {/* IVA acreditable */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">IVA acreditable</p>
          <p className="text-xl font-extrabold">{formatMXN(resumen.ivaAcreditable)}</p>
          <p className="text-[11px] font-mono text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-2 py-1">
            Suma del 16% de tus compras con factura
          </p>
          <p className="text-xs text-muted-foreground">El IVA que pagaste en compras con factura. Esto reduce lo que le debes al SAT.</p>
        </div>

      </div>

      {/* Explicaciones detalladas */}
      <ReporteDescriptivo r={resumen} periodo={periodo} />

      {/* Aviso */}
      <p className="text-xs text-center text-muted-foreground px-4">
        ⚠️ Esto es una estimación informativa. No sustituye la asesoría de un
        contador certificado.
      </p>

      {/* Guardar */}
      <button
        onClick={guardar}
        disabled={guardando}
        className="w-full rounded-2xl bg-primary p-4 text-primary-foreground font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {guardando ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Save className="h-5 w-5" />
        )}
        Guardar este cálculo
      </button>
    </div>
  );

  return (
    <div className="px-4 pt-6 pb-32 space-y-6 animate-slide-up">
      {Header}
      {paso === 0 && Paso0}
      {paso === 1 && Paso1}
      {paso === 2 && Paso2}
      {paso === 3 && Paso3}
>>>>>>> Facilito_alpha
    </div>
  );
}
