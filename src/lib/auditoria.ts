import { supabase } from "@/integrations/supabase/client";

export type AccionAuditoria =
  | "LOGIN"
  | "LOGOUT"
  | "TRANSACCION_CREADA"
  | "TRANSACCION_ELIMINADA"
  | "TRANSACCION_EDITADA"
  | "CALCULO_GUARDADO"
  | "CONTADOR_ASIGNADO"
  | "CONTADOR_REMOVIDO"
  | "CLIENTE_ASIGNADO"
  | "CLIENTE_REMOVIDO"
  | "CREDITO_SOLICITADO"
  | "TICKET_SUBIDO";

export async function auditLog(accion: AccionAuditoria, metadata: Record<string, any> = {}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    const usuario_id = u.user?.id;
    if (!usuario_id) return;
    await supabase.from("auditoria").insert({ usuario_id, accion, metadata });
  } catch {
    // silencioso: no rompemos la UX por auditoría
  }
}

// Alias retro-compatible
export const registrarAuditoria = auditLog;
