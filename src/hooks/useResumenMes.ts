import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useNegocio } from "./useNegocio";
import { calcularResumen, type Movimiento, type ResumenFiscal } from "@/lib/fiscal";

export function useResumenMes(mes: number, anio: number) {
  const { negocio } = useNegocio();
  const [movs, setMovs] = useState<(Movimiento & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<ResumenFiscal | null>(null);

  useEffect(() => {
    if (!negocio) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
      const finDate = new Date(anio, mes, 0);
      const fin = `${anio}-${String(mes).padStart(2, "0")}-${String(finDate.getDate()).padStart(2, "0")}`;
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
        .single();
        
      // Si la tabla no existe aún, config será null y usamos 16% por defecto
      const ivaRate = config?.iva_rate ? Number(config.iva_rate) : 0.16;

      if (cancel) return;
      type TxRow = { id: string; tipo: string; monto: number; fecha: string; con_factura: boolean | null; descripcion: string | null };
      const m = (data ?? []) as TxRow[];
      setMovs(m as (Movimiento & { id: string })[]);
      setResumen(calcularResumen(m as Movimiento[], ivaRate));
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [negocio, mes, anio]);

  return { movs, resumen, loading };
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
      if (mesGastos && mesGastos.length > 0) {
        list.push({ id: "tickets-faltan", emoji: "📸", texto: "Recuerda guardar foto de tus tickets" });
      }
      if (!cancel) setAvisos(list);
    })();
    return () => { cancel = true; };
  }, [user, negocio]);

  return avisos;
}
