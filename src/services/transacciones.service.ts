import { supabase } from "@/integrations/supabase/client";
import { TransaccionSchema, type TransaccionInput } from "@/validators/transaccion.schema";
import { throwValidation } from "@/lib/errors";
import { sanitizeText } from "@/lib/sanitize";
import { auditLog } from "@/lib/auditoria";
import { enqueueTx } from "@/lib/offlineQueue";

export interface CrearTxArgs extends TransaccionInput {
  usuario_id: string;
  negocio_id: string;
  origen?: string;
}

export interface CrearTxResult {
  ok: boolean;
  offline: boolean;
}

export async function crearTransaccion(args: CrearTxArgs): Promise<CrearTxResult> {
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
    usuario_id: args.usuario_id,
    negocio_id: args.negocio_id,
    tipo: data.tipo,
    monto: data.monto,
    descripcion: sanitizeText(data.descripcion ?? null),
    origen: args.origen ?? "manual",
    con_factura: data.con_factura ?? true,
    ...(data.fecha ? { fecha: data.fecha } : {}),
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueueTx({
      usuario_id: row.usuario_id,
      negocio_id: row.negocio_id,
      tipo: row.tipo,
      monto: row.monto,
      descripcion: row.descripcion,
      con_factura: row.con_factura,
      origen: row.origen,
      fecha: data.fecha,
    });
    return { ok: true, offline: true };
  }

  const { error } = await supabase.from("transacciones").insert(row);
  if (error) throw new Error("No pudimos guardar tu información. Inténtalo nuevamente.");
  void auditLog("TRANSACCION_CREADA", { tipo: row.tipo, monto: row.monto });
  return { ok: true, offline: false };
}

export async function eliminarTransaccion(id: string) {
  const { error } = await supabase.from("transacciones").delete().eq("id", id);
  if (error) throw new Error("No pudimos eliminar el movimiento");
  void auditLog("TRANSACCION_ELIMINADA", { id });
}
