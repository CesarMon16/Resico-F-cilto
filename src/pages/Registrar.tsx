import { useParams, useNavigate, Navigate, useLocation } from "react-router-dom";
import { ArrowLeft, DollarSign, FileText, Camera, Sparkles, Loader2, X, Check, AlertCircle, ImagePlus, AlertTriangle, ArrowLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TransaccionSchema, type TransaccionForm } from "@/validators/transaccion.schema";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNegocio } from "@/hooks/useNegocio";
import { crearTransaccion } from "@/services/transacciones.service";
import { handleError } from "@/lib/errors";
import { procesarImagenTicket, type OCRResult } from "@/lib/ocrEngine";
import { CameraOverlay } from "@/components/CameraOverlay";
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
  const location = useLocation();
  const { user } = useAuth();
  const { negocio, loading: negocioLoading } = useNegocio();
  const isIngreso = tipo === "ingreso";

  // Pre-llenar si viene de Expediente
  const initialData = location.state as { monto?: number; descripcion?: string } | null;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TransaccionForm>({
    resolver: zodResolver(TransaccionSchema),
    defaultValues: {
      tipo: isIngreso ? "ingreso" : "gasto",
      monto: initialData?.monto || 0,
      concepto: initialData?.descripcion || ""
    }
  });

  const montoWatch = watch("monto");
  const conceptoWatch = watch("concepto");

  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [ocrStep, setOcrStep] = useState<string>("");
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [limiteExcedidoOpen, setLimiteExcedidoOpen] = useState(false);
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

  const onFormSubmit = async (data: TransaccionForm) => {
    if (!user || !negocio) {
      toast.error("Espera, estamos preparando tu negocio");
      return;
    }

    // ── Validación de tope anual RESICO (solo aplica a ingresos) ──
    if (isIngreso && !validarTopeResico(acumuladoAnual, data.monto)) {
      setLimiteExcedidoOpen(true);
      return;
    }

    setBusy(true);
    try {
      const r = await crearTransaccion({
        usuario_id: user.id,
        negocio_id: negocio.id,
        tipo: isIngreso ? "INGRESO" : "GASTO",
        monto: data.monto,
        descripcion: data.concepto.trim() || null,
      });
      if (r.offline) {
        toast.success("Guardado sin internet. Lo enviaremos cuando vuelvas en línea 📶");
      } else {
        toast.success(
          isIngreso
            ? `¡Listo! Registraste una venta de $${data.monto.toLocaleString("es-MX")}`
            : `¡Listo! Registraste un gasto de $${data.monto.toLocaleString("es-MX")}`,
        );
      }
      navigate("/");
    } catch (err) {
      handleError(err, "No pudimos guardar tu información. Inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  };

  const procesarOCR = async (file: File) => {
    setShowCamera(false);
    setPreview(URL.createObjectURL(file));
    setAnalyzing(true);
    setOcrResult(null);

    try {
      setOcrStep("Escaneando imagen...");
      await new Promise(r => setTimeout(r, 800));

      const datos = await procesarImagenTicket(file);

      setOcrStep("Extrayendo montos y conceptos...");
      await new Promise(r => setTimeout(r, 600));

      if (datos.monto_detectado) {
        setValue("monto", datos.monto_detectado, { shouldValidate: true });
      }

      // Para gastos, sugerimos el RFC si existe
      if (!isIngreso && datos.rfc_emisor) {
        setValue("concepto", `Gasto RFC: ${datos.rfc_emisor}`, { shouldValidate: true });
      }

      setOcrResult(datos);
      toast.success("¡Datos extraídos con éxito! 🧐");
    } catch (err: any) {
      console.error(err);
      toast.error("No pudimos leer el ticket: " + (err.message || "Error desconocido"));
    } finally {
      setAnalyzing(false);
      setOcrStep("");
    }
  };

  if (!negocioLoading && !negocio) return <Navigate to="/preparar-negocio" replace />;

  const colorFocus = isIngreso ? "focus:ring-green-400" : "focus:ring-rose-400";
  const colorBtn = isIngreso ? "bg-income text-primary-foreground" : "bg-expense text-primary-foreground";

  return (
    <div className="px-4 pt-6 space-y-6 animate-slide-up pb-10">
      {showCamera && (
        <CameraOverlay
          onCapture={procesarOCR}
          onClose={() => setShowCamera(false)}
        />
      )}

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

      <form onSubmit={handleSubmit(onFormSubmit)} noValidate className="space-y-5">
        {preview && (
          <div className="relative group rounded-2xl overflow-hidden border-2 border-primary/20 bg-card aspect-[4/3] shadow-inner">
            <img src={preview} alt="Ticket preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => { setPreview(null); setAnalyzing(false); setOcrResult(null); }}
              className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full backdrop-blur-md z-10"
            >
              <X className="h-5 w-5" />
            </button>
            {analyzing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white text-center p-4">
                <div className="relative mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                </div>
                <p className="font-bold text-lg">{ocrStep}</p>
                <div className="w-48 h-1.5 bg-white/20 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-primary animate-progress-indefinite w-1/2"></div>
                </div>
              </div>
            )}
            {ocrResult && !analyzing && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                <div className="flex items-center gap-2">
                  {ocrResult.confidence_score >= 0.9 ? (
                    <div className="flex items-center gap-1 text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                      <Check className="h-3 w-3" /> Confianza alta ({Math.round(ocrResult.confidence_score * 100)}%)
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30">
                      <AlertCircle className="h-3 w-3" /> Revisar datos
                    </div>
                  )}
                  {ocrResult.rfc_emisor && (
                    <div className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                      RFC: {ocrResult.rfc_emisor}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
              placeholder="0.00"
              {...register("monto", { valueAsNumber: true })}
              className={`w-full rounded-xl border p-4 pl-12 text-2xl font-bold outline-none focus:ring-2 bg-card transition-colors ${errors.monto
                  ? "border-destructive focus:ring-destructive/40"
                  : `border-input ${colorFocus}`
                }`}
              required
            />
          </div>
          {errors.monto ? (
            <p className="mt-1.5 text-xs text-destructive font-semibold">
              ⚠️ {errors.monto.message}
            </p>
          ) : montoWatch > 0 ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              ✅ ${montoWatch.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
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
              placeholder="Ej: Venta del día, pago de luz..."
              {...register("concepto")}
              className={`w-full rounded-xl border p-4 pl-12 text-base outline-none focus:ring-2 bg-card transition-colors ${errors.concepto
                  ? "border-destructive focus:ring-destructive/40"
                  : `border-input ${colorFocus}`
                }`}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            {errors.concepto ? (
              <p className="text-xs text-destructive font-semibold">⚠️ {errors.concepto.message}</p>
            ) : (
              <span />
            )}
            <p
              className={`text-xs ${conceptoWatch.length > 90
                  ? "text-destructive font-semibold"
                  : "text-muted-foreground"
                }`}
            >
              {conceptoWatch.length}/100
            </p>
          </div>
        </div>

        {/* ── OCR (solo gastos) ── */}
        {!isIngreso && !preview && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-4 text-muted-foreground transition-colors hover:border-primary hover:text-primary bg-card/50"
            >
              <Camera className="h-6 w-6" />
              <span className="font-bold text-xs">Tomar foto</span>
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-4 text-muted-foreground transition-colors hover:border-primary hover:text-primary bg-card/50"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="font-bold text-xs">De galería</span>
            </button>
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && e.target.files[0] && procesarOCR(e.target.files[0])}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={busy || analyzing || negocioLoading || !negocio}
          className={`w-full rounded-xl p-4 text-lg font-bold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 ${colorBtn}`}
        >
          {busy ? "Guardando..." : analyzing ? "Analizando..." : negocioLoading || !negocio ? "Preparando..." : isIngreso ? "Registrar venta" : "Registrar gasto"}
        </button>

        {Object.keys(errors).length > 0 && (
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
