import { Bell, X, Check, Info, AlertTriangle, AlertCircle } from "lucide-react";
import { useAvisos } from "@/hooks/useResumenMes";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNegocio } from "@/hooks/useNegocio";
import { NotificationService, type Notification } from "@/services/notification.service";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export function Avisos() {
  const { user } = useAuth();
  const { negocio } = useNegocio();
  const staticAvisos = useAvisos();
  const [abierto, setAbierto] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !negocio || !abierto) return;
    
    async function fetchNotifs() {
      setLoading(true);
      try {
        const service = new NotificationService(user!.id, negocio!.id);
        const data = await service.listar();
        setNotifs(data || []);
      } catch (err) {
        console.error("Error al cargar notificaciones:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchNotifs();
  }, [user, negocio, abierto]);

  const noLeidas = notifs.filter(n => !n.leido).length;
  const totalAlertas = staticAvisos.length + noLeidas;

  const marcarLeida = async (id: string) => {
    if (!user || !negocio) return;
    try {
      const service = new NotificationService(user.id, negocio.id);
      await service.marcarComoLeida(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));
    } catch (err) {
      toast.error("No pudimos actualizar la notificación");
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className={`relative rounded-full p-2.5 transition-all duration-300 ${
          totalAlertas > 0 ? "bg-primary/10 text-primary animate-pulse-subtle" : "bg-muted text-foreground"
        } hover:bg-border`}
        aria-label="Avisos"
      >
        <Bell className="h-5 w-5" />
        {totalAlertas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground border-2 border-card">
            {totalAlertas}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 top-12 z-40 w-80 rounded-2xl border border-border bg-card p-4 shadow-xl animate-in fade-in zoom-in duration-200 origin-top-right">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-extrabold text-base">Notificaciones</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Centro de avisos</p>
              </div>
              <button onClick={() => setAbierto(false)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[350px] overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {/* Avisos estáticos del sistema */}
              {staticAvisos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Sugerencias hoy</p>
                  {staticAvisos.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 rounded-xl bg-blue-50/50 border border-blue-100 p-3 text-sm">
                      <span className="text-xl">{a.emoji}</span>
                      <p className="text-blue-900 font-medium leading-tight">{a.texto}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Notificaciones de base de datos */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Historial</p>
                {loading && notifs.length === 0 ? (
                  <div className="py-8 flex justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : notifs.length === 0 && staticAvisos.length === 0 ? (
                  <div className="py-8 text-center">
                    <Check className="h-8 w-8 mx-auto text-green-500 opacity-20 mb-2" />
                    <p className="text-sm text-muted-foreground">Todo al día ✅</p>
                  </div>
                ) : (
                  notifs.map((n) => (
                    <div 
                      key={n.id} 
                      className={`group relative flex items-start gap-3 rounded-xl p-3 text-sm transition-all border ${
                        n.leido ? "bg-card border-transparent grayscale-[0.5] opacity-70" : "bg-muted/50 border-border shadow-sm ring-1 ring-primary/5"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${getNotifColor(n.tipo)}`}>
                        <NotifIcon tipo={n.tipo} />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <p className={`font-bold leading-tight ${n.leido ? "text-muted-foreground" : "text-foreground"}`}>
                          {n.titulo}
                        </p>
                        <p className="text-xs text-muted-foreground leading-snug">{n.mensaje}</p>
                        <p className="text-[9px] text-muted-foreground/60 font-bold mt-1">
                          {format(new Date(n.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                        </p>
                      </div>
                      {!n.leido && (
                        <button 
                          onClick={() => marcarLeida(n.id)}
                          className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full"
                          title="Marcar como leída"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotifIcon({ tipo }: { tipo: string }) {
  const cls = "h-3.5 w-3.5";
  if (tipo === 'success') return <Check className={cls} />;
  if (tipo === 'warning') return <AlertTriangle className={cls} />;
  if (tipo === 'error') return <AlertCircle className={cls} />;
  return <Info className={cls} />;
}

function getNotifColor(tipo: string) {
  if (tipo === 'success') return "bg-green-500/10 text-green-600";
  if (tipo === 'warning') return "bg-yellow-500/10 text-yellow-600";
  if (tipo === 'error') return "bg-red-500/10 text-red-600";
  return "bg-blue-500/10 text-blue-600";
}
