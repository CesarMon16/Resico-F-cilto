import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Store, 
  Phone, 
  FileText, 
  LogOut, 
  ChevronRight,
  Save,
  Upload,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Negocio {
  id?: string;
  nombre_negocio: string;
  giro: string;
}

export default function Perfil() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Estados para formularios
  const [editNombre, setEditNombre] = useState("");
  const [editNegocio, setEditNegocio] = useState("");
  const [editTelefono, setEditTelefono] = useState("");

  useEffect(() => {
    getProfileData();
  }, []);

  const getProfileData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setEditNombre(user?.user_metadata?.full_name || "");
      setEditTelefono(user?.phone || "");

      if (user) {
        const { data: negocioData } = await supabase
          .from('negocios')
          .select('*')
          .eq('usuario_id', user.id)
          .single();
        
        if (negocioData) {
          setNegocio(negocioData);
          setEditNegocio(negocioData.nombre_negocio);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 1. Actualizar Nombre
  const updateProfile = async () => {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: editNombre }
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Perfil actualizado", description: "Tu nombre ha sido guardado correctamente." });
      getProfileData();
    }
  };

  // 2. Actualizar Negocio (Funcional)
  const updateNegocio = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('negocios')
      .update({ nombre_negocio: editNegocio })
      .eq('usuario_id', user.id);

    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar el negocio.", variant: "destructive" });
    } else {
      toast({ title: "Negocio actualizado", description: "Los cambios se han guardado." });
      getProfileData();
    }
  };

  // 3. Cambiar Teléfono (Funcional)
  const updateTelefono = async () => {
    const { error } = await supabase.auth.updateUser({ phone: editTelefono });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Verificación enviada", description: "Revisa tus mensajes SMS para confirmar el cambio." });
    }
  };

  // 4. Integración de Documentos (Supabase Storage)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      
      if (!file || !user) return;

      // Extraemos la extensión (jpg, png, pdf)
      const fileExt = file.name.split('.').pop();
      
      // IMPORTANTE: Generamos un nombre simple. 
      // No incluyas carpetas como "documentos/" aquí si el error persiste, 
      // mejor guarda el archivo directamente en la raíz del bucket por ahora.
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('expedientes') 
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      toast({ 
        title: "¡Éxito!", 
        description: "Archivo guardado en tu expediente digital.",
      });

    } catch (error: any) {
      // Si el error dice "UUID", es que Supabase sigue esperando un ID de usuario en algún campo automático
      console.error("Detalle del error:", error);
      toast({ 
        title: "Error de formato", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-primary animate-pulse">Cargando perfil...</div>;

  const inicial = user?.user_metadata?.full_name?.charAt(0).toUpperCase() || "U";

  return (
    <div className="px-4 pt-6 space-y-6 pb-24 animate-fade-in">
      {/* Avatar y Status */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground shadow-lg border-4 border-background">
          {inicial}
        </div>
        <h1 className="mt-3 text-xl font-extrabold tracking-tight">{user?.user_metadata?.full_name || "Usuario"}</h1>
        <p className="text-muted-foreground text-sm font-medium">{negocio?.nombre_negocio || "Sin negocio registrado"}</p>
        
        {/* Badge de RESICO Activo Reincorporado */}
        <div className="mt-2 flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success border border-success/20">
          <CheckCircle2 className="h-3.5 w-3.5" />
          RESICO activo
        </div>
      </div>

      <div className="space-y-3">
        {/* Botón: Mis Datos */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 shadow-sm border border-transparent active:scale-95 transition-all">
              <div className="bg-primary/10 p-2 rounded-xl"><User className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 text-left font-bold text-sm">Mis datos personales</div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl w-[90%] mx-auto">
            <DialogHeader><DialogTitle>Editar Perfil</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre completo</Label>
                <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
              </div>
              <Button onClick={updateProfile} className="w-full font-bold">Guardar cambios</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Botón: Mi Negocio (Ahora Funcional) */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 shadow-sm border border-transparent active:scale-95 transition-all">
              <div className="bg-primary/10 p-2 rounded-xl"><Store className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 text-left font-bold text-sm">Mi negocio</div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl w-[90%] mx-auto">
            <DialogHeader><DialogTitle>Datos del Negocio</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre comercial</Label>
                <Input value={editNegocio} onChange={(e) => setEditNegocio(e.target.value)} />
              </div>
              <Button onClick={updateNegocio} className="w-full font-bold">Actualizar Negocio</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Botón: Cambiar Teléfono (Ahora Funcional) */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 shadow-sm border border-transparent active:scale-95 transition-all">
              <div className="bg-primary/10 p-2 rounded-xl"><Phone className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 text-left font-bold text-sm">Cambiar teléfono</div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl w-[90%] mx-auto">
            <DialogHeader><DialogTitle>Seguridad</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nuevo número de teléfono</Label>
                <Input type="tel" placeholder="+52..." value={editTelefono} onChange={(e) => setEditTelefono(e.target.value)} />
              </div>
              <Button onClick={updateTelefono} className="w-full font-bold">Enviar código de confirmación</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Botón: Mis Documentos (Integración real) */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 shadow-sm border border-transparent active:scale-95 transition-all">
              <div className="bg-primary/10 p-2 rounded-xl"><FileText className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 text-left font-bold text-sm">Mis documentos</div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl w-[90%] mx-auto">
            <DialogHeader><DialogTitle>Expediente Fiscal</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4 text-center">
              <p className="text-xs text-muted-foreground">Digitaliza tus documentos o sube tu Constancia de Situación Fiscal.</p>
              
              <label className="cursor-pointer group">
                <div className="border-2 border-dashed border-primary/20 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 bg-primary/5 group-hover:bg-primary/10 transition-colors">
                  <Upload className={`h-10 w-10 ${uploading ? 'animate-bounce' : 'text-primary/40'}`} />
                  <span className="text-xs font-bold text-primary/60">
                    {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
                  </span>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </div>
              </label>
              
              <Button variant="ghost" className="w-full text-xs font-bold text-muted-foreground">
                Ver historial de archivos
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <button 
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 font-extrabold text-destructive hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="h-5 w-5" /> Cerrar sesión
      </button>
    </div>
  );
}