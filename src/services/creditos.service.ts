import { supabase } from "@/integrations/supabase/client";
import { CreditoSchema } from "@/validators/credito.schema";
import { throwValidation } from "@/lib/errors";
import { auditLog } from "@/lib/auditoria";

export async function solicitarCredito(usuario_id: string, monto: number) {
  const data = throwValidation(CreditoSchema.safeParse({ monto })) as { monto: number };
  const { error } = await supabase.from("creditos").insert({
    usuario_id,
    monto_solicitado: data.monto,
    estatus: "SOLICITADO",
  });
  if (error) throw new Error("No se pudo enviar tu solicitud. Intenta de nuevo");
  void auditLog("CREDITO_SOLICITADO", { monto: data.monto });
}
