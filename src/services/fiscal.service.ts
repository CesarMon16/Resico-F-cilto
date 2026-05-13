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

  // 1. Verificar versiones existentes
  const { data: previas } = await supabase
    .from("calculos_fiscales")
    .select("version")
    .eq("negocio_id", args.negocio_id)
    .eq("periodo", periodo)
    .order("version", { ascending: false })
    .limit(1);

  const ultimaVersion = previas && previas.length > 0 ? previas[0].version : 0;
  
  if (ultimaVersion >= 4) {
    throw new Error("Has alcanzado el límite legal de 1 declaración normal y 3 complementarias para este periodo.");
  }

  const nuevaVersion = ultimaVersion + 1;
  const tipo = nuevaVersion === 1 ? "normal" : "complementaria";

  // 2. Insertar nueva versión
  const { error } = await supabase.from("calculos_fiscales").insert({
    usuario_id: args.usuario_id,
    negocio_id: args.negocio_id,
    periodo,
    ingresos: args.resumen.ingresosTotal,
    gastos: args.resumen.gastosTotal,
    isr_estimado: args.resumen.isr,
    iva_estimado: Math.max(args.resumen.ivaAPagar, 0),
    tipo_declaracion: tipo,
    version: nuevaVersion
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error("Ya existe una declaración con esta versión para este periodo.");
    }
    throw new Error("No pudimos guardar tu cálculo. Inténtalo nuevamente.");
  }

  void auditLog("CALCULO_GUARDADO", { periodo, isr: args.resumen.isr, tipo, version: nuevaVersion });
}
