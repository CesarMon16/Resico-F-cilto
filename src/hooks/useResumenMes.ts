import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useNegocio } from "./useNegocio";
import { calcularResumen, type Movimiento, type ResumenFiscal } from "@/lib/fiscal";
import { getRangoPeriodo } from "@/lib/fiscal-lock";
import type { Tables } from "@/integrations/supabase/types";

export function useResumenMes(anio: number, mes?: number) {
  const { negocio } = useNegocio();
  const [movs, setMovs] = useState<Tables<"transacciones">[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<ResumenFiscal | null>(null);
  const [isDeclarado, setIsDeclarado] = useState(false);

  useEffect(() => {
    if (!negocio) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      setMovs([]); // Resetear para evitar datos fantasmas del mes anterior
      let inicio: string;
      let fin: string;

      if (mes) {
        const rango = getRangoPeriodo(anio, mes);
        inicio = rango.start;
        fin = rango.end;
      } else {
        inicio = `${anio}-01-01`;
        fin = `${anio}-12-31`;
      }
      
      const { data } = await supabase
        .from("transacciones")
        .select("id, tipo, monto, fecha, con_factura, descripcion")
        .eq("negocio_id", negocio.id)
        .gte("fecha", inicio)
        .lte("fecha", fin)
        .order("fecha", { ascending: false });

      const { data: config } = await supabase
        .from("configuracion_sistema")
        .select("iva_rate")
        .eq("id", 1)
        .maybeSingle();
        
      const ivaRate = config?.iva_rate ? Number(config.iva_rate) : 0.16;

      let checkDeclarado = false;
      if (mes) {
        const periodoStr = `${anio}-${String(mes).padStart(2, "0")}`;
        const { count } = await supabase
          .from("calculos_fiscales")
          .select("*", { count: 'exact', head: true })
          .eq("negocio_id", negocio.id)
          .eq("periodo", periodoStr);
        checkDeclarado = (count ?? 0) > 0;
      }

      if (cancel) return;
      const m = data ?? [];
      setMovs(m);
      setResumen(calcularResumen(m as Movimiento[], ivaRate));
      setIsDeclarado(checkDeclarado);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [negocio, anio, mes]);

  return { movs, resumen, loading, isDeclarado };
}

export function useAvisos() {
  const { user } = useAuth();
  const { negocio } = useNegocio();
  const [avisos, setAvisos] = useState<{ id: string; texto: string; emoji: string }[]>([]);

  useEffect(() => {
    if (!user || !negocio) return;
    let cancel = false;
    (async () => {
      const hoy = new Date();
      const inicioHoy = hoy.toISOString().slice(0, 10);
      const inicioMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;

      const { data: hoyTx } = await supabase
        .from("transacciones")
        .select("id")
        .eq("negocio_id", negocio.id)
        .eq("tipo", "INGRESO")
        .eq("fecha", inicioHoy)
        .limit(1);

      const { data: mesGastos } = await supabase
        .from("transacciones")
        .select("id")
        .eq("negocio_id", negocio.id)
        .eq("tipo", "GASTO")
        .gte("fecha", inicioMes);

      const list: { id: string; texto: string; emoji: string }[] = [];
      if (!hoyTx || hoyTx.length === 0) {
        list.push({ id: "sin-ventas-hoy", emoji: "🛒", texto: "Aún no registras ventas hoy" });
      }
      if (hoy.getDate() <= 5) {
        list.push({ id: "resumen-mensual", emoji: "📊", texto: "Tu resumen del mes ya está listo" });
      }
      if (!cancel) setAvisos(list);
    })();
    return () => { cancel = true; };
  }, [user, negocio]);

  return avisos;
}
