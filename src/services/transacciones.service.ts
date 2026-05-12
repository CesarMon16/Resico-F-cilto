import { supabase } from "@/integrations/supabase/client";
import { TransaccionSchema, type TransaccionInput } from "@/validators/transaccion.schema";
import { throwValidation } from "@/lib/errors";
import { sanitizeText } from "@/lib/sanitize";
import { enqueueTx } from "@/lib/offlineQueue";
import { BaseService } from "./base.service";
import { wrapError } from "@/lib/error-handler";

export interface CrearTxArgs extends TransaccionInput {
  origen?: string;
}

export interface CrearTxResult {
  ok: boolean;
  offline: boolean;
  id?: string;
}

/**
 * Servicio evolucionado para la gestión de transacciones.
 * Extiende BaseService para heredar aislamiento multi-tenant y auditoría.
 */
export class TransaccionesService extends BaseService {
  async crear(args: CrearTxArgs): Promise<CrearTxResult> {
    const data = throwValidation(
      TransaccionSchema.safeParse({
        tipo: args.tipo,
        monto: args.monto,
        descripcion: args.descripcion,
        con_factura: args.con_factura,
        fecha: args.fecha,
      }),
    ) as TransaccionInput;

    const row = {
      usuario_id: this.usuario_id,
      negocio_id: this.negocio_id,
      tipo: data.tipo,
      monto: data.monto,
      descripcion: sanitizeText(data.descripcion ?? null),
      origen: args.origen ?? "manual",
      con_factura: data.con_factura ?? true,
      ...(data.fecha ? { fecha: data.fecha } : {}),
    };

    // Soporte Offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueTx({ ...row, fecha: data.fecha });
      return { ok: true, offline: true };
    }

    try {
      const { data: inserted, error } = await supabase
        .from("transacciones")
        .insert(row)
        .select("id")
        .single();

      if (error) throw error;

      return await this.exec(
        async () => ({ data: { ok: true, offline: false, id: inserted?.id }, error: null }),
        "TRANSACCION_CREADA",
        { tipo: row.tipo, monto: row.monto, id: inserted?.id }
      );
    } catch (err) {
      throw wrapError(err);
    }
  }

  async eliminar(id: string): Promise<void> {
    return this.exec(
      async () => {
        const { error } = await supabase
          .from("transacciones")
          .delete()
          .eq("id", id)
          .eq("negocio_id", this.negocio_id); // Refuerzo multi-tenant en código
        return { data: null, error };
      },
      "TRANSACCION_ELIMINADA",
      { id }
    );
  }

  async listar(limit = 50) {
    return this.exec(
      async () => supabase
        .from("transacciones")
        .select("*")
        .eq("negocio_id", this.negocio_id)
        .order("fecha", { ascending: false })
        .limit(limit)
    );
  }
}

/**
 * Funciones de exportación para mantener compatibilidad con componentes existentes.
 * Internamente usan la nueva clase TransaccionesService.
 */
export async function crearTransaccion(args: CrearTxArgs & { usuario_id: string; negocio_id: string }): Promise<CrearTxResult> {
  const service = new TransaccionesService(args.usuario_id, args.negocio_id);
  return service.crear(args);
}

export async function eliminarTransaccion(id: string) {
  // Nota: Esto requiere que el contexto sepa el usuario/negocio. 
  // En componentes de UI se recomienda usar directamente la clase TransaccionesService.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión no válida");
  
  // Obtenemos el negocio_id activo (asumiendo que hay una forma de obtenerlo)
  const { data: negocio } = await supabase.from('negocios').select('id').eq('usuario_id', user.id).single();
  if (!negocio) throw new Error("Negocio no encontrado");

  const service = new TransaccionesService(user.id, negocio.id);
  return service.eliminar(id);
}
