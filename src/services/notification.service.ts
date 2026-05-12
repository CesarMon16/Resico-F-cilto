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

  /**
   * Guarda una suscripción push en la base de datos.
   */
  async guardarSuscripcion(subscription: PushSubscription) {
    return this.exec(async () => {
      const { endpoint, keys } = subscription.toJSON();
      if (!endpoint || !keys) throw new Error("Suscripción inválida");

      return supabase
        .from("push_subscriptions")
        .upsert({
          usuario_id: this.usuario_id,
          endpoint: endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth
        }, { onConflict: 'endpoint' });
    }, "SUSCRIPCION_PUSH_GUARDADA");
  }

  /**
   * Elimina una suscripción push.
   */
  async eliminarSuscripcion(endpoint: string) {
    return this.exec(async () => {
      return supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", endpoint)
        .eq("usuario_id", this.usuario_id);
    }, "SUSCRIPCION_PUSH_ELIMINADA");
  }
}
