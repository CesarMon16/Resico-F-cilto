import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionItem } from "@/components/TransactionItem";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  descripcion: string;
  monto: number;
  tipo: "ingreso" | "gasto";
  fecha: string;
}

export default function Historial() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transacciones, setTransacciones] = useState<Transaction[]>([]);

  useEffect(() => {
    fetchTransacciones();
  }, []);

  const fetchTransacciones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transacciones')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;
      setTransacciones(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const eliminarTransaccion = async (id: string) => {
    if (!confirm("¿Seguro que quieres borrar este registro?")) return;

    try {
      const { error } = await supabase
        .from('transacciones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Eliminado", description: "El registro ha sido borrado." });
      setTransacciones(transacciones.filter(t => t.id !== id));
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-extrabold">Historial</h1>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando movimientos...</div>
      ) : (
        <div className="space-y-4">
          {transacciones.length > 0 ? (
            transacciones.map((t) => (
              <div key={t.id} className="relative group">
                <TransactionItem
                  title={t.descripcion}
                  amount={t.monto}
                  date={new Date(t.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  type={t.tipo}
                />
                <button 
                  onClick={() => eliminarTransaccion(t.id)}
                  className="absolute -right-2 -top-2 bg-destructive text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
              <p className="text-muted-foreground font-bold">No hay nada registrado aún.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
