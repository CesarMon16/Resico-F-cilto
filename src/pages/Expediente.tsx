import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, Trash2, ImagePlus, Sparkles, Check, AlertCircle, ExternalLink, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MESES_ES } from "@/lib/fiscal";
import { toast } from "sonner";
import { extraerDatosTicket, type DatosTicket } from "@/lib/ocr";
import { CameraOverlay } from "@/components/CameraOverlay";

type Ticket = {
  name: string;
  path: string;
  url: string;
  created_at: string;
};

const HOY = new Date();

export default function Expediente() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mes, setMes] = useState(HOY.getMonth() + 1);
  const [anio, setAnio] = useState(HOY.getFullYear());
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{ path: string; data: DatosTicket } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);

  const folder = user ? `${user.id}/${anio}-${String(mes).padStart(2, "0")}` : "";

  const cargar = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.storage.from("tickets").list(folder, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) {
      toast.error("No se pudo cargar tu expediente");
      setLoading(false);
      return;
    }
    const items: Ticket[] = await Promise.all(
      (data ?? [])
        .filter((f) => f.name && !f.name.startsWith("."))
        .map(async (f) => {
          const path = `${folder}/${f.name}`;
          const { data: signed } = await supabase.storage
            .from("tickets")
            .createSignedUrl(path, 3600);
          return {
            name: f.name,
            path,
            url: signed?.signedUrl ?? "",
            created_at: (f.created_at as string | undefined) ?? "",
          };
        })
    );
    setTickets(items);
    setLoading(false);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mes, anio]);

  const subir = async (files: FileList | File[] | null) => {
    if (!files || !user) return;
    setUploading(true);
    setShowCamera(false);
    let ok = 0;
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    for (const file of fileArray) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from("tickets").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
      if (!error) ok++;
    }
    setUploading(false);
    if (ok > 0) toast.success(`${ok} ticket${ok > 1 ? "s" : ""} guardado${ok > 1 ? "s" : ""}`);
    if (galleryRef.current) galleryRef.current.value = "";
    cargar();
  };

  const borrar = async (path: string) => {
    if (!confirm("¿Borrar este ticket?")) return;
    const { error } = await supabase.storage.from("tickets").remove([path]);
    if (error) {
      toast.error("No se pudo borrar");
      return;
    }
    toast.success("Borrado");
    if (analysisResult?.path === path) setAnalysisResult(null);
    cargar();
  };

  const analizarTicket = async (ticket: Ticket) => {
    setAnalyzing(ticket.path);
    try {
      const response = await fetch(ticket.url);
      const blob = await response.blob();
      const file = new File([blob], ticket.name, { type: blob.type });
      
      const data = await extraerDatosTicket(file);
      setAnalysisResult({ path: ticket.path, data });
      toast.success("¡Análisis completado!");
    } catch (err: any) {
      toast.error("Error al analizar: " + (err.message || "Error desconocido"));
    } finally {
      setAnalyzing(null);
    }
  };

  const anios = [HOY.getFullYear() - 1, HOY.getFullYear(), HOY.getFullYear() + 1];

  return (
    <div className="px-4 pt-6 pb-32 space-y-5 animate-slide-up">
      {showCamera && (
        <CameraOverlay 
          onCapture={(file) => subir([file])} 
          onClose={() => setShowCamera(false)} 
        />
      )}

      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground font-semibold"
      >
        <ArrowLeft className="h-5 w-5" /> Regresar
      </button>

      <div>
        <h1 className="text-2xl font-extrabold">Mi expediente 📸</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Guarda fotos de tus tickets y facturas. Analízalos con IA para registrarlos al instante.
        </p>
      </div>

      <div className="flex gap-2">
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="flex-1 rounded-xl border border-input bg-card p-3 font-semibold outline-none focus:ring-2 ring-ring"
        >
          {MESES_ES.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
          className="rounded-xl border border-input bg-card p-3 font-semibold outline-none focus:ring-2 ring-ring"
        >
          {anios.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowCamera(true)}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-primary p-5 font-bold text-primary-foreground shadow-md transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <Camera className="h-7 w-7" />}
          <span>Tomar foto</span>
        </button>
        <button
          onClick={() => galleryRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-muted p-5 font-bold text-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
        >
          <ImagePlus className="h-7 w-7" />
          <span>De galería</span>
        </button>
      </div>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => subir(e.target.files)}
      />

      {analysisResult && (
        <div className="rounded-2xl bg-primary/5 border-2 border-primary/20 p-5 space-y-4 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Sparkles className="h-5 w-5" />
              <span>Análisis de IA</span>
            </div>
            <button onClick={() => setAnalysisResult(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Monto detectado</p>
              <p className="text-xl font-extrabold text-primary">${analysisResult.data.monto?.toLocaleString() ?? "???"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Confianza</p>
              <div className="flex items-center gap-1 mt-1">
                {analysisResult.data.confianza === "alta" ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                    <Check className="h-3 w-3" /> Alta
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-yellow-600">
                    <AlertCircle className="h-3 w-3" /> Media
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Concepto sugerido</p>
            <p className="text-sm font-semibold">{analysisResult.data.descripcion}</p>
          </div>

          <button
            onClick={() => navigate("/registrar/gasto", { state: { monto: analysisResult.data.monto, descripcion: analysisResult.data.descripcion } })}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary p-3 font-bold text-primary-foreground shadow-md active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" /> Registrar como gasto
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl bg-muted p-8 text-center">
          <p className="text-4xl">🗂️</p>
          <p className="mt-2 font-bold">Sin tickets en {MESES_ES[mes - 1]}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Toca "Tomar foto" para guardar el primero.
          </p>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-sm font-semibold text-muted-foreground">
            {tickets.length} ticket{tickets.length > 1 ? "s" : ""} en {MESES_ES[mes - 1]} {anio}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {tickets.map((t) => (
              <div key={t.path} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
                <img src={t.url} alt="Ticket" className="h-full w-full object-cover" loading="lazy" />
                
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <button
                    onClick={() => analizarTicket(t)}
                    disabled={!!analyzing}
                    className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-black shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {analyzing === t.path ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
                    Analizar
                  </button>
                  <a href={t.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-white/80 hover:text-white underline font-semibold">
                    <ExternalLink className="h-3 w-3" /> Ver original
                  </a>
                </div>

                <button
                  onClick={() => borrar(t.path)}
                  className="absolute right-2 top-2 rounded-full bg-destructive/90 p-1.5 text-destructive-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Borrar"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
