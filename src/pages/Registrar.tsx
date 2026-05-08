import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, Save, Calculator, Tag, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const Registrar = () => {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const esIngreso = tipo === "ingreso";

  // --- FUNCIÓN REAL DE IA (CONEXIÓN CON EDGE FUNCTION) ---
  const handleScanTicket = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      toast({ 
        title: "Escaneando ticket...", 
        description: "Enviando imagen a la IA para análisis.",
      });

      // 1. Convertimos la imagen a Base64
      const reader = new FileReader();
      const base64 = await new Promise((res) => {
        reader.onload = () => res(reader.result?.toString().split(',')[1]);
        reader.readAsDataURL(file);
      });

      // 2. Invocamos la función ocr-ticket en Supabase
      const { data, error } = await supabase.functions.invoke('ocr-ticket', {
        body: { imageBase64: base64 }
      });

      if (error) throw error;

      // 3. Procesamos la respuesta de la IA
      if (data && data.total > 0) {
        setMonto(data.total.toString());
        setDescripcion("Gasto detectado por IA (Google Vision)");
        
        toast({ 
          title: "¡Lectura exitosa!", 
          description: `Se detectó un monto de $${data.total}. Por favor, verifícalo.`,
        });
      } else {
        toast({ 
          title: "Aviso", 
          description: "No pudimos extraer un monto claro. Intenta ingresarlo manual.",
        });
      }

    } catch (error: any) {
      console.error("Error OCR:", error);
      toast({ 
        title: "Error de lectura", 
        description: "Hubo un fallo al conectar con el servicio de IA.", 
        variant: "destructive" 
      });
    } finally {
      setIsScanning(false);
      // Limpiamos el input de archivo
      if (event.target) event.target.value = '';
    }
  };

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

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

      const { error: errorTransaccion } = await supabase
        .from('transacciones')
        .insert([
          {
            negocio_id: negocio.id,
            tipo: esIngreso ? 'ingreso' : 'gasto',
            monto: parseFloat(monto),
            descripcion: descripcion || (esIngreso ? "Venta del día" : "Gasto registrado"),
            origen: isScanning ? 'OCR' : 'manual'
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
        {/* Card del Monto */}
        <Card className="border-2 border-primary/20 overflow-hidden">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                ¿Cuánto fue?
              </div>
              {isScanning && <Sparkles className="h-5 w-5 text-secondary animate-pulse" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-gray-400">$</span>
              <Input
                type="number"
                placeholder="0.00"
                className={`text-4xl h-20 pl-12 font-bold border-none bg-gray-50 focus-visible:ring-primary transition-all ${isScanning ? "opacity-50" : "opacity-100"}`}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                inputMode="decimal"
                disabled={isScanning}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card de Detalles */}
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
              disabled={isScanning}
            />
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              {!esIngreso ? (
                <label className={`h-16 flex flex-col items-center justify-center gap-1 border-dashed border-2 rounded-md cursor-pointer transition-colors ${isScanning ? "bg-primary/10 border-primary" : "border-gray-200 hover:bg-gray-50"}`}>
                  <Camera className={`h-6 w-6 ${isScanning ? "text-primary animate-bounce" : "text-gray-500"}`} />
                  <span className="text-[10px] font-bold uppercase">{isScanning ? "Leyendo..." : "Usar IA Ticket"}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleScanTicket} disabled={isScanning} />
                </label>
              ) : (
                <div className="h-16 flex flex-col items-center justify-center gap-1 border-2 border-gray-100 rounded-md bg-gray-50 opacity-50">
                   <Sparkles className="h-6 w-6 text-gray-400" />
                   <span className="text-[10px] font-bold uppercase">Solo Gastos</span>
                </div>
              )}

              <Button 
                className="h-16 flex flex-col gap-1 text-lg font-bold" 
                onClick={handleGuardar}
                disabled={loading || isScanning}
              >
                <Save className="h-6 w-6" />
                <span className="text-xs">{loading ? "..." : "Guardar"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Registrar;