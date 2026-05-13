import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { FiscalDocumentsUpload } from "@/components/perfil/FiscalDocumentsUpload";
import { FiscalProgress } from "@/components/perfil/FiscalProgress";

export default function DocumentosFiscales() {
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-6 pb-20 space-y-6 animate-slide-up">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground font-semibold"
      >
        <ArrowLeft className="h-5 w-5" /> Regresar
      </button>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold text-foreground">Mis Documentos 📄</h1>
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Sube tus archivos fiscales para que podamos gestionar tus impuestos automáticamente.
        </p>
      </div>

      <FiscalProgress />

      <div className="space-y-4">
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">Requisitos Fiscales</h2>
        <FiscalDocumentsUpload />
      </div>
    </div>
  );
}
