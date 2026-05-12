import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, Shield, Info, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AuditRecord {
  id: string;
  accion: string;
  fecha: string;
  metadata: any;
  profiles: {
    nombre: string;
  } | null;
}

export function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      const { data, error } = await supabase
        .from("auditoria")
        .select(`
          id,
          accion,
          fecha,
          metadata,
          profiles:usuario_id (nombre)
        `)
        .order("fecha", { ascending: false })
        .limit(50);

      if (!error) setLogs(data as any);
      setLoading(false);
    }
    fetchLogs();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <History className="h-10 w-10 animate-spin opacity-20 mb-4" />
      <p className="font-bold">Consultando registros de seguridad...</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="font-extrabold text-xl">Bitácora de Seguridad</h2>
      </div>

      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="text-center py-10 bg-muted/30 rounded-3xl border-2 border-dashed">
            <Info className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
            <p className="text-sm text-muted-foreground">No hay actividad registrada aún.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div 
              key={log.id} 
              className="bg-card border border-border p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex gap-3">
                  <div className={`p-2 rounded-xl ${getActionColor(log.accion)} bg-opacity-10 text-opacity-100`}>
                    <getActionIcon accion={log.accion} className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-tight">{log.accion.replace(/_/g, ' ')}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 font-semibold">
                      <User className="h-3 w-3" />
                      {log.profiles?.nombre || "Sistema / Invitado"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                  <Clock className="h-3 w-3" />
                  {format(new Date(log.fecha), "d MMM, HH:mm", { locale: es })}
                </div>
              </div>
              
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(log.metadata).map(([key, val]) => (
                      <span key={key} className="text-[10px] bg-muted px-2 py-0.5 rounded-md text-muted-foreground font-mono">
                        <span className="font-bold">{key}:</span> {String(val)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getActionIcon({ accion, className }: { accion: string, className?: string }) {
  if (accion.includes('ELIMINADA')) return <Info className={className} />;
  if (accion.includes('TRANSACCION')) return <History className={className} />;
  if (accion.includes('LOGIN')) return <Shield className={className} />;
  return <Info className={className} />;
}

function getActionColor(accion: string) {
  if (accion.includes('ELIMINADA')) return 'text-red-500 bg-red-500';
  if (accion.includes('ERROR')) return 'text-orange-500 bg-orange-500';
  if (accion.includes('TRANSACCION')) return 'text-emerald-500 bg-emerald-500';
  return 'text-blue-500 bg-blue-500';
}
