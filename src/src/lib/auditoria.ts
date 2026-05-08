import { supabase } from "@/integrations/supabase/client";

export type AccionAuditoria =
  | "LOGIN"
  | "TRANSACCION_CREADA"
  | "CALCULO_GUARDADO"
  | "CONTADOR_ASIGNADO"
  | "CONTADOR_REMOVIDO"
  | "TICKET_SUBIDO";

export async function registrarAuditoria(
  accion: AccionAuditoria,
  metadata: Record<string, any> = {},
) {
  try {
    const { data: u } = await supabase.auth.getUser();
    const usuario_id = u.user?.id;
    if (!usuario_id) return;
    await supabase.from("auditoria").insert({
      usuario_id,
      accion,
      metadata,
    });
  } catch {
    // silencioso: no rompemos la UX por auditoría
  }
}
