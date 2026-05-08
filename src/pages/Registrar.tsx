import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, Save, Calculator, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const Registrar = () => {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);

  const esIngreso = tipo === "ingreso";

  const handleGuardar = async () => {
    if (!monto || isNaN(parseFloat(monto))) {
      toast({
        title: "Dato inválido",
        description: "Por favor, ingresa un monto válido.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Obtener el ID del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No hay sesión activa");

      // 2. Obtener o crear un negocio por defecto para este usuario
      let { data: negocio } = await supabase
        .from('negocios')
        .select('id')
        .eq('usuario_id', user.id)
        .single();

      if (!negocio) {
        const { data: nuevoNegocio, error: errorNegocio } = await supabase
          .from('negocios')
          .insert([{ usuario_id: user.id, nombre_negocio: "Mi Negocio" }])
          .select()
          .single();
        
        if (errorNegocio) throw errorNegocio;
        negocio = nuevoNegocio;
      }

      // 3. Guardar la transacción
      const { error: errorTransaccion } = await supabase
        .from('transacciones')
        .insert([
          {
            negocio_id: negocio.id,
            tipo: esIngreso ? 'ingreso' : 'gasto',
            monto: parseFloat(monto),
            descripcion: descripcion || (esIngreso ? "Venta del día" : "Gasto registrado"),
            origen: 'manual'
          }
        ]);

      if (errorTransaccion) throw errorTransaccion;

      toast({
        title: "¡Listo!",
        description: `${esIngreso ? "Venta" : "Gasto"} guardado correctamente.`,
      });
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold">
          Registrar {esIngreso ? "Ingreso" : "Gasto"}
        </h1>
      </div>

      <div className="space-y-6">
        <Card className="border-2 border-primary/20">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              ¿Cuánto fue?
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-gray-400">$</span>
              <Input
                type="number"
                placeholder="0.00"
                className="text-4xl h-20 pl-12 font-bold border-none bg-gray-50 focus-visible:ring-primary"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                inputMode="decimal"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              ¿Qué compraste o vendiste?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Ej. Venta de comida, Pago de luz..."
              className="text-lg h-12"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <Button variant="outline" className="h-16 flex flex-col gap-1 border-dashed border-2">
                <Camera className="h-6 w-6" />
                <span className="text-xs">Foto del ticket</span>
              </Button>
              <Button 
                className="h-16 flex flex-col gap-1 text-lg" 
                onClick={handleGuardar}
                disabled={loading}
              >
                <Save className="h-6 w-6" />
                <span className="text-xs">{loading ? "Guardando..." : "Guardar"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Registrar;