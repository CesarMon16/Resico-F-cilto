import { supabase } from "@/integrations/supabase/client";
import { BaseService } from "./base.service";
import { wrapError } from "@/lib/error-handler";

export interface Notification {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  leido: boolean;
  created_at: string;
}

/**
 * Servicio para la gestión de notificaciones del sistema.
 */
export class NotificationService extends BaseService {
  /**
   * Obtiene las notificaciones del usuario actual.
   */
  async listar(soloNoLeidas = false) {
    return this.exec(async () => {
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("usuario_id", this.usuario_id)
        .order("created_at", { ascending: false });

      if (soloNoLeidas) {
        query = query.eq("leido", false);
      }

      return query;
    }, "NOTIFICACIONES_LISTADAS");
  }

  /**
   * Marca una notificación como leída.
   */
  async marcarComoLeida(id: string) {
    return this.exec(async () => {
      return supabase
        .from("notifications")
        .update({ leido: true })
        .eq("id", id)
        .eq("usuario_id", this.usuario_id);
    }, "NOTIFICACION_LEIDA", { id });
  }

  /**
   * Envía una notificación (normalmente llamado desde el servidor o procesos automáticos).
   */
  async enviar(args: { titulo: string; mensaje: string; tipo?: 'info' | 'success' | 'warning' | 'error'; metadata?: any }) {
    return this.exec(async () => {
      return supabase
        .from("notifications")
        .insert({
          usuario_id: this.usuario_id,
          negocio_id: this.negocio_id,
          titulo: args.titulo,
          mensaje: args.mensaje,
          tipo: args.tipo ?? 'info',
          metadata: args.metadata
        });
    }, "NOTIFICACION_ENVIADA");
  }
}
