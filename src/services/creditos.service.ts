import { supabase } from "@/integrations/supabase/client";
import { CreditoSchema } from "@/validators/credito.schema";
import { throwValidation } from "@/lib/errors";
import { auditLog } from "@/lib/auditoria";

export async function solicitarCredito(usuario_id: string, monto: number, plazo: number, proposito: string) {
  const { error } = await supabase.from("creditos").insert({
    usuario_id,
    monto_solicitado: monto,
    plazo,
    proposito,
    estatus: "SOLICITADO",
  });
  if (error) throw new Error("No se pudo enviar tu solicitud. Intenta de nuevo");
  void auditLog("CREDITO_SOLICITADO", { monto, plazo, proposito });
}
