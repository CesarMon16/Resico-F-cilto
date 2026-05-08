import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, Trash2, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MESES_ES } from "@/lib/fiscal";
import { toast } from "sonner";

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
  const fileRef = useRef<HTMLInputElement>(null);

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
            created_at: (f as any).created_at ?? "",
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

  const subir = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
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
    if (fileRef.current) fileRef.current.value = "";
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
    cargar();
  };

  const anios = [HOY.getFullYear() - 1, HOY.getFullYear(), HOY.getFullYear() + 1];

  return (
    <div className="px-4 pt-6 pb-32 space-y-5 animate-slide-up">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground font-semibold"
      >
        <ArrowLeft className="h-5 w-5" /> Regresar
      </button>

      <div>
        <h1 className="text-2xl font-extrabold">Mi expediente 📸</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Guarda fotos de tus tickets, facturas y comprobantes. Los tendrás siempre a la mano cuando los necesites.
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
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-primary p-5 font-bold text-primary-foreground shadow-md transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <Camera className="h-7 w-7" />}
          <span>Tomar foto</span>
        </button>
        <button
          onClick={() => {
            if (fileRef.current) {
              fileRef.current.removeAttribute("capture");
              fileRef.current.click();
              // restore for next time
              setTimeout(() => fileRef.current?.setAttribute("capture", "environment"), 100);
            }
          }}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-muted p-5 font-bold text-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
        >
          <ImagePlus className="h-7 w-7" />
          <span>De galería</span>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => subir(e.target.files)}
      />

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
              <div key={t.path} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                <a href={t.url} target="_blank" rel="noreferrer">
                  <img src={t.url} alt="Ticket" className="h-full w-full object-cover" loading="lazy" />
                </a>
                <button
                  onClick={() => borrar(t.path)}
                  className="absolute right-2 top-2 rounded-full bg-destructive/90 p-2 text-destructive-foreground shadow-md"
                  aria-label="Borrar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
