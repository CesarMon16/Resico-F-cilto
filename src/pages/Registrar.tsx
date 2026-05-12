import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, DollarSign, FileText, Camera, Sparkles, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNegocio } from "@/hooks/useNegocio";
import { crearTransaccion } from "@/services/transacciones.service";
import { handleError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { calcularAcumuladoAnual, validarTopeResico } from "@/lib/fiscalEngine";
import { LIMITE_ANUAL_RESICO } from "@/lib/constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Registrar() {
  const { tipo } = useParams<{ tipo: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { negocio, loading: negocioLoading } = useNegocio();
  const isIngreso = tipo === "ingreso";

  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState({ monto: false, descripcion: false });

  // ── Estado del diálogo de límite excedido ──
  const [limiteExcedidoOpen, setLimiteExcedidoOpen] = useState(false);

  // ── Acumulado anual (solo para ingresos) ──
  const [acumuladoAnual, setAcumuladoAnual] = useState(0);

  useEffect(() => {
    if (!isIngreso || !negocio) return;
    const anioActual = new Date().getFullYear();
    supabase
      .from("transacciones")
      .select("monto, tipo, fecha")
      .eq("negocio_id", negocio.id)
      .eq("tipo", "INGRESO")
      .gte("fecha", `${anioActual}-01-01`)
      .lte("fecha", `${anioActual}-12-31`)
      .then(({ data }) => {
        if (!data) return;
        const acum = calcularAcumuladoAnual(
          data.map((r) => ({
            monto: Number(r.monto),
            tipo: "ingreso",
            fecha: r.fecha as string,
          })),
          anioActual,
        );
        setAcumuladoAnual(acum);
      });
  }, [isIngreso, negocio]);

  /* ── Validaciones ── */
  const montoNum = parseFloat(monto);
  const montoError = (() => {
    if (!touched.monto) return "";
    if (!monto.trim()) return "El monto es obligatorio.";
    if (isNaN(montoNum) || !isFinite(montoNum)) return "Ingresa un número válido.";
    if (montoNum <= 0) return "El monto debe ser mayor a $0.";
    if (montoNum < 0.01) return "El monto mínimo es $0.01.";
    if (montoNum > 3_500_000) return "El monto supera el límite anual RESICO ($3,500,000).";
    return "";
  })();

  const descError = (() => {
    if (!touched.descripcion) return "";
    if (descripcion.length > 200) return "Máximo 200 caracteres.";
    return "";
  })();

  const formValido =
    !montoError && !descError && monto.trim() !== "" && montoNum > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ monto: true, descripcion: true });
    if (!formValido) return;
    if (!user || !negocio) {
      toast.error("Espera, estamos preparando tu negocio");
      return;
    }

    // ── Validación de tope anual RESICO (solo aplica a ingresos) ──
    if (isIngreso && !validarTopeResico(acumuladoAnual, montoNum)) {
      // Bloquear la mutación y mostrar diálogo de restricción
      setLimiteExcedidoOpen(true);
      return;
    }

    setBusy(true);
    try {
      const r = await crearTransaccion({
        usuario_id: user.id,
        negocio_id: negocio.id,
        tipo: isIngreso ? "INGRESO" : "GASTO",
        monto: montoNum,
        descripcion: descripcion.trim() || null,
      });
      if (r.offline) {
        toast.success("Guardado sin internet. Lo enviaremos cuando vuelvas en línea 📶");
      } else {
        toast.success(
          isIngreso
            ? `¡Listo! Registraste una venta de $${montoNum.toLocaleString("es-MX")}`
            : `¡Listo! Registraste un gasto de $${montoNum.toLocaleString("es-MX")}`,
        );
      }
      navigate("/");
    } catch (err) {
      handleError(err, "No pudimos guardar tu información. Inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  };

  // OCR simulado
  const simularOCR = (file: File) => {
    const m = file.name.match(/(\d+(?:[.,]\d{1,2})?)/);
    let sugerido =
      m
        ? Number(m[1].replace(",", "."))
        : Math.round((50 + Math.random() * 950) * 100) / 100;
    if (!Number.isFinite(sugerido) || sugerido <= 0) sugerido = 100;
    setMonto(String(sugerido));
    setTouched((t) => ({ ...t, monto: true }));
    if (!descripcion) setDescripcion("Ticket escaneado");
    toast("Sugerencia desde la foto. Revisa el monto antes de guardar 👀");
  };

  if (!negocioLoading && !negocio) return <Navigate to="/preparar-negocio" replace />;

  const colorFocus = isIngreso ? "focus:ring-green-400" : "focus:ring-rose-400";
  const colorBtn = isIngreso
    ? "bg-income text-primary-foreground"
    : "bg-expense text-primary-foreground";

  return (
    <div className="px-4 pt-6 space-y-6 animate-slide-up">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground font-semibold"
      >
        <ArrowLeft className="h-5 w-5" />
        Regresar
      </button>

      <div className={`rounded-2xl p-6 ${isIngreso ? "bg-income-light" : "bg-expense-light"}`}>
        <h1 className={`text-2xl font-extrabold ${isIngreso ? "text-income" : "text-expense"}`}>
          {isIngreso ? "💰 ¿Cuánto vendiste?" : "🛒 ¿Cuánto gastaste?"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isIngreso
            ? "Registra lo que ganaste hoy"
            : "Registra lo que compraste o pagaste"}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">

        {/* ── Monto ── */}
        <div>
          <label className="mb-2 block font-bold">
            Cantidad <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              max="3500000"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, monto: true }))}
              className={`w-full rounded-xl border p-4 pl-12 text-2xl font-bold outline-none focus:ring-2 bg-card transition-colors ${
                montoError
                  ? "border-destructive focus:ring-destructive/40"
                  : `border-input ${colorFocus}`
              }`}
            />
          </div>
          {montoError ? (
            <p className="mt-1.5 text-xs text-destructive font-semibold">
              ⚠️ {montoError}
            </p>
          ) : monto && touched.monto ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              ✅ ${montoNum.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
            </p>
          ) : null}
        </div>

        {/* ── Descripción ── */}
        <div>
          <label className="mb-2 block font-bold">
            ¿De qué fue?{" "}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <div className="relative">
            <FileText className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              maxLength={200}
              placeholder="Ej: Venta del día, pago de luz..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, descripcion: true }))}
              className={`w-full rounded-xl border p-4 pl-12 text-base outline-none focus:ring-2 bg-card transition-colors ${
                descError
                  ? "border-destructive focus:ring-destructive/40"
                  : `border-input ${colorFocus}`
              }`}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            {descError ? (
              <p className="text-xs text-destructive font-semibold">⚠️ {descError}</p>
            ) : (
              <span />
            )}
            <p
              className={`text-xs ${
                descripcion.length > 180
                  ? "text-destructive font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              {descripcion.length}/200
            </p>
          </div>
        </div>

        {/* ── OCR (solo gastos) ── */}
        {!isIngreso && (
          <label className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-muted-foreground transition-colors hover:border-primary hover:text-primary cursor-pointer">
            <Camera className="h-5 w-5" />
            <Sparkles className="h-4 w-4" />
            <span className="font-semibold">Detectar datos del ticket</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) =>
                e.target.files && e.target.files[0] && simularOCR(e.target.files[0])
              }
            />
          </label>
        )}

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={busy || negocioLoading || !negocio}
          className={`w-full rounded-xl p-4 text-lg font-bold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 ${colorBtn}`}
        >
          {busy
            ? "Guardando..."
            : negocioLoading || !negocio
            ? "Preparando..."
            : isIngreso
            ? "Registrar venta"
            : "Registrar gasto"}
        </button>

        {touched.monto && !formValido && (
          <p className="text-center text-xs text-muted-foreground">
            Corrige los campos marcados antes de continuar.
          </p>
        )}
      </form>

      {/* ── AlertDialog: Límite RESICO excedido ── */}
      <AlertDialog open={limiteExcedidoOpen} onOpenChange={setLimiteExcedidoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Código de restricción: ERR_LIMITE_RESICO_01
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              El registro de esta transacción resulta en un acumulado anual superior a{" "}
              <span className="font-bold text-foreground">
                ${LIMITE_ANUAL_RESICO.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
              </span>
              . El sistema bloqueará la operación. Requiere transición a Régimen General de Ley.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setLimiteExcedidoOpen(false)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
