import { TransactionItem, Transaction } from "@/components/TransactionItem";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNegocio } from "@/hooks/useNegocio";

const filters = ["Todos", "Ventas", "Gastos"] as const;

export default function Historial() {
  const { negocio } = useNegocio();
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!negocio) return;
    setLoading(true);
    supabase
      .from("transacciones")
      .select("id, tipo, monto, descripcion, fecha")
      .eq("negocio_id", negocio.id)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setItems(
          (data ?? []).map((t: { id: string; tipo: string; monto: number | string; descripcion: string | null; fecha: string }) => ({
            id: t.id,
            tipo: t.tipo,
            monto: Number(t.monto),
            descripcion: t.descripcion ?? "",
            fecha: new Date(t.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }),
          }))
        );
        setLoading(false);
      });
  }, [negocio]);

  const filtered = items.filter((t) => {
    if (filter === "Ventas") return t.tipo === "INGRESO";
    if (filter === "Gastos") return t.tipo === "GASTO";
    return true;
  });

  return (
    <div className="px-4 pt-6 space-y-5">
      <h1 className="text-2xl font-extrabold">📋 Tu historial</h1>

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
              filter === f ? "bg-primary text-primary-foreground shadow" : "bg-muted text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-6">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Sin movimientos todavía</p>
        ) : (
          filtered.map((t) => <TransactionItem key={t.id} {...t} />)
        )}
      </div>
    </div>
  );
}
