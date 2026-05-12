import { supabase } from "@/integrations/supabase/client";
import type { ResumenFiscal } from "@/lib/fiscal";
import { auditLog } from "@/lib/auditoria";

export async function guardarCalculoFiscal(args: {
  usuario_id: string;
  negocio_id: string;
  mes: number;
  anio: number;
  resumen: ResumenFiscal;
}) {
  const periodo = `${args.anio}-${String(args.mes).padStart(2, "0")}`;
  const { error } = await supabase.from("calculos_fiscales").insert({
    usuario_id: args.usuario_id,
    negocio_id: args.negocio_id,
    periodo,
    ingresos: args.resumen.ingresosTotal,
    gastos: args.resumen.gastosTotal,
    isr_estimado: args.resumen.isr,
    iva_estimado: Math.max(args.resumen.ivaAPagar, 0),
  });
  if (error) throw new Error("No pudimos guardar tu cálculo. Inténtalo nuevamente.");
  void auditLog("CALCULO_GUARDADO", { periodo, isr: args.resumen.isr });
}
