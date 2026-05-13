import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNegocio } from "@/hooks/useNegocio";
import { FileText, Upload, Check, Loader2, X, AlertCircle, FileUp } from "lucide-react";
import { toast } from "sonner";

const DOCUMENT_TYPES = [
  { id: "constancia", label: "Constancia de Situación Fiscal", type: "Constancia de Situación Fiscal", accept: ".pdf" },
  { id: "efirma_cer", label: "e.firma - Certificado (.cer)", type: "e.firma (CER)", accept: ".cer" },
  { id: "efirma_key", label: "e.firma - Llave (.key)", type: "e.firma (KEY)", accept: ".key" },
  { id: "opinion", label: "Opinión de Cumplimiento", type: "Opinión de Cumplimiento", accept: ".pdf" },
];

export function FiscalDocumentsUpload() {
  const { user } = useAuth();
  const { negocio } = useNegocio();
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const cargarDocs = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("documentos")
      .select("tipo, url")
      .eq("usuario_id", user.id);

    if (!error && data) {
      const docsMap: Record<string, string> = {};
      data.forEach((d) => {
        docsMap[d.tipo] = d.url;
      });
      setUploadedDocs(docsMap);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    cargarDocs();
  }, [cargarDocs]);

  const handleUpload = async (file: File, docType: string) => {
    if (!user) return;
    setUploading(docType);

    try {
      const ext = file.name.split(".").pop();
      // Saneamos el nombre del tipo de documento (quitar acentos y espacios)
      const sanitizedType = docType
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_");

      const path = `${user.id}/fiscal/${sanitizedType}.${ext}`;

      // 1. Subir a Storage (usando 'tickets' como bucket seguro)
      const { error: storageError } = await supabase.storage
        .from("tickets")
        .upload(path, file, { upsert: true });

      if (storageError) throw storageError;

      // 2. Registrar en la tabla documentos
      const { error: dbError } = await supabase
        .from("documentos")
        .upsert({
          usuario_id: user.id,
          negocio_id: negocio?.id || null,
          tipo: docType,
          url: path,
          fecha_subida: new Date().toISOString(),
        }, { onConflict: "usuario_id, tipo" });

      if (dbError) throw dbError;

      toast.success(`${docType} subido con éxito`);
      cargarDocs();
    } catch (err: any) {
      toast.error(`Error al subir ${docType}: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground">Cargando expediente fiscal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {DOCUMENT_TYPES.map((doc) => {
        const isUploaded = !!uploadedDocs[doc.type];
        const isUploading = uploading === doc.type;

        return (
          <div
            key={doc.id}
            className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition-all ${
              isUploaded 
                ? "bg-success-light/30 border-success/20" 
                : "bg-card border-border hover:border-primary/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2.5 ${isUploaded ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                {isUploaded ? <Check className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-bold">{doc.label}</p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {isUploaded ? "✅ Archivo guardado" : "⏳ Pendiente de subir"}
                </p>
              </div>
            </div>

            <label className={`relative flex items-center justify-center h-10 w-10 rounded-full transition-all cursor-pointer ${
              isUploading ? "bg-muted" : isUploaded ? "bg-success/20 text-success hover:bg-success/30" : "bg-primary text-primary-foreground hover:scale-110"
            }`}>
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isUploaded ? (
                <FileUp className="h-5 w-5" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              <input
                type="file"
                accept={doc.accept}
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file, doc.type);
                }}
              />
            </label>
          </div>
        );
      })}

      <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-5 space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <AlertCircle className="h-5 w-5" />
          <h4 className="font-extrabold text-sm uppercase tracking-wide">¿Por qué son necesarios?</h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tu e.firma y sellos digitales (CSD) son indispensables para que tu contador pueda presentar declaraciones y facturar en tu nombre. 
          <span className="block mt-2 font-bold text-foreground">🔒 Estos archivos se guardan de forma encriptada y segura.</span>
        </p>
      </div>
    </div>
  );
}
