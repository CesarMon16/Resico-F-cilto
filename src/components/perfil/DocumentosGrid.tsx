import { useEffect, useState, useCallback } from "react";
import { FileText, Image as ImageIcon, FileCode, Archive, File, Download, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Documento {
  name: string;
  id: string;
  created_at: string;
  metadata: {
    size: number;
    mimetype: string;
  };
}

export function DocumentosGrid() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDocumentos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Listamos del bucket 'documentos'. Asumimos que existe o usamos 'tickets' como fallback si falla.
      const { data, error: storageError } = await supabase.storage
        .from("documentos")
        .list(user.id, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (storageError) {
        // Si el bucket no existe o hay error, intentamos con 'tickets' para no dejar la UI vacía si es una migración
        const { data: ticketData, error: ticketError } = await supabase.storage
          .from("tickets")
          .list(user.id, { limit: 20 });
        
        if (ticketError) throw storageError;
        setDocs(ticketData as any[] ?? []);
      } else {
        setDocs(data as any[] ?? []);
      }
    } catch (err: any) {
      console.error("Error cargando documentos:", err);
      setError("No se pudieron cargar los documentos");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    cargarDocumentos();
  }, [cargarDocumentos]);

  const descargar = async (fileName: string) => {
    try {
      const bucket = "documentos"; // Intentar primero con documentos
      const path = `${user?.id}/${fileName}`;
      
      const { data, error } = await supabase.storage.from(bucket).download(path);
      
      if (error) {
        // Fallback a tickets
        const { data: tData, error: tError } = await supabase.storage.from("tickets").download(path);
        if (tError) throw tError;
        downloadBlob(tData, fileName);
      } else {
        downloadBlob(data, fileName);
      }
    } catch (err) {
      toast.error("Error al descargar el archivo");
    }
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Buscando documentos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-6 text-center space-y-3">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <div>
          <p className="font-bold text-destructive">Error de conexión</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
        <button 
          onClick={cargarDocumentos}
          className="text-xs font-bold text-primary underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="rounded-2xl bg-muted/50 border border-dashed border-border p-8 text-center">
        <p className="text-4xl mb-3">📂</p>
        <p className="font-bold">Tu expediente está vacío</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
          Aquí aparecerán tus facturas, constancias y otros documentos importantes.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {docs.filter(d => d.name !== ".emptyKeep").map((doc) => {
        const ext = doc.name.split(".").pop()?.toLowerCase() || "";
        const Icon = getIcon(ext);
        const color = getIconColor(ext);

        return (
          <div 
            key={doc.id || doc.name} 
            className="group relative flex flex-col items-center justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30"
          >
            <div className={`mb-3 rounded-xl ${color} p-3 transition-transform group-hover:scale-110`}>
              <Icon className="h-6 w-6" />
            </div>
            
            <div className="w-full text-center">
              <p className="truncate text-[11px] font-bold text-foreground" title={doc.name}>
                {doc.name}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {formatSize(doc.metadata?.size || 0)}
              </p>
            </div>

            <button
              onClick={() => descargar(doc.name)}
              className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-lg bg-primary/10 py-2 text-[10px] font-extrabold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Download className="h-3 w-3" />
              Descargar
            </button>
          </div>
        );
      })}
    </div>
  );
}

function getIcon(ext: string) {
  if (["pdf"].includes(ext)) return FileText;
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return ImageIcon;
  if (["xml", "json", "html"].includes(ext)) return FileCode;
  if (["zip", "rar", "7z", "tar"].includes(ext)) return Archive;
  return File;
}

function getIconColor(ext: string) {
  if (["pdf"].includes(ext)) return "bg-red-100 text-red-600";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "bg-blue-100 text-blue-600";
  if (["xml", "json", "html"].includes(ext)) return "bg-green-100 text-green-600";
  if (["zip", "rar", "7z", "tar"].includes(ext)) return "bg-amber-100 text-amber-600";
  return "bg-slate-100 text-slate-600";
}

function formatSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
