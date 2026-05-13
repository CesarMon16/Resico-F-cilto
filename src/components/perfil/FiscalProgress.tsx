import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const DOCUMENT_TYPES = [
  "Constancia de Situación Fiscal",
  "e.firma (CER)",
  "e.firma (KEY)",
  "Opinión de Cumplimiento",
];

export function FiscalProgress() {
  const { user } = useAuth();
  const [uploadedCount, setUploadedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDocCount = async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("tipo")
        .eq("usuario_id", user.id)
        .in("tipo", DOCUMENT_TYPES);

      if (!error && data) {
        // Count unique types from the list
        const uniqueTypes = new Set(data.map((d) => d.tipo));
        setUploadedCount(uniqueTypes.size);
      }
      setLoading(false);
    };

    fetchDocCount();

    // Subscribe to changes in the documentos table
    const channel = supabase
      .channel("documentos_progress")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documentos", filter: `usuario_id=eq.${user.id}` },
        () => fetchDocCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-20 items-center justify-center rounded-2xl bg-muted/30 p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const percentage = (uploadedCount / DOCUMENT_TYPES.length) * 100;
  const isComplete = uploadedCount === DOCUMENT_TYPES.length;

  return (
    <div className="rounded-2xl bg-card border border-border p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="font-extrabold text-sm flex items-center gap-1.5">
            Estado del expediente {isComplete ? "✅" : "⏳"}
          </h3>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            {uploadedCount} de {DOCUMENT_TYPES.length} documentos subidos
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${isComplete ? "bg-success-light text-success" : "bg-warning-light text-warning"}`}>
          {isComplete ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {isComplete ? "COMPLETO" : "INCOMPLETO"}
        </div>
      </div>

      <div className="space-y-2">
        <Progress value={percentage} className="h-2.5 bg-muted" />
        <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground uppercase">
          <span>Progreso</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      </div>

      {!isComplete && (
        <p className="text-[11px] text-muted-foreground leading-relaxed italic">
          ⚠️ Te faltan {DOCUMENT_TYPES.length - uploadedCount} documentos para estar al 100% con tu contador.
        </p>
      )}
    </div>
  );
}
