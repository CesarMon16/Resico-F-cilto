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
  
  // --- NUEVOS ESTADOS PARA ARCHIVOS ---
  const [archivos, setArchivos] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

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

  // --- NUEVA FUNCIÓN PARA LISTAR ARCHIVOS ---
  const fetchArchivos = async () => {
    try {
      setLoadingFiles(true);
      const { data, error } = await supabase.storage
        .from('expedientes')
        .list('', {
          limit: 20,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;
      setArchivos(data || []);
    } catch (error: any) {
      console.error("Error listando archivos:", error);
    } finally {
      setLoadingFiles(false);
    }
  };

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

  const updateNegocio = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('negocios')
      .update({ nombre_negocio: editNegocio })
      .eq('usuario_id', user.id);

    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" });
    } else {
      toast({ title: "Negocio actualizado", description: "Cambios guardados." });
      getProfileData();
    }
  };

  const updateTelefono = async () => {
    const { error } = await supabase.auth.updateUser({ phone: editTelefono });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Actualizado", description: "Teléfono guardado." });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file || !user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('expedientes') 
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      toast({ title: "¡Éxito!", description: "Archivo guardado." });
      fetchArchivos(); // Recargamos la lista después de subir
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-primary animate-pulse">Cargando...</div>;

  const inicial = user?.user_metadata?.full_name?.charAt(0).toUpperCase() || "U";

  return (
    <div className="px-4 pt-6 space-y-6 pb-24 animate-fade-in">
      {/* Avatar y Status */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground shadow-lg">
          {inicial}
        </div>
        <h1 className="mt-3 text-xl font-extrabold">{user?.user_metadata?.full_name || "Usuario"}</h1>
        <p className="text-muted-foreground text-sm font-medium">{negocio?.nombre_negocio || "Sin negocio"}</p>
        <div className="mt-2 flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success border border-success/20">
          <CheckCircle2 className="h-3.5 w-3.5" />
          RESICO activo
        </div>
      </div>

      <div className="space-y-3">
        {/* Mis Datos */}
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
              <Label>Nombre completo</Label>
              <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
              <Button onClick={updateProfile} className="w-full">Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mi Negocio */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 shadow-sm active:scale-95 transition-all">
              <div className="bg-primary/10 p-2 rounded-xl"><Store className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 text-left font-bold text-sm">Mi negocio</div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl w-[90%] mx-auto">
            <DialogHeader><DialogTitle>Datos del Negocio</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <Label>Nombre comercial</Label>
              <Input value={editNegocio} onChange={(e) => setEditNegocio(e.target.value)} />
              <Button onClick={updateNegocio} className="w-full">Actualizar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Teléfono */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 shadow-sm active:scale-95 transition-all">
              <div className="bg-primary/10 p-2 rounded-xl"><Phone className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 text-left font-bold text-sm">Cambiar teléfono</div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl w-[90%] mx-auto">
            <DialogHeader><DialogTitle>Seguridad</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <Label>Número (+52...)</Label>
              <Input type="tel" value={editTelefono} onChange={(e) => setEditTelefono(e.target.value)} />
              <Button onClick={updateTelefono} className="w-full">Guardar número</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* --- MODAL DE DOCUMENTOS CON LISTADO --- */}
        <Dialog>
          <DialogTrigger asChild>
            <button 
              onClick={fetchArchivos} 
              className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 shadow-sm active:scale-95 transition-all"
            >
              <div className="bg-primary/10 p-2 rounded-xl"><FileText className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 text-left font-bold text-sm">Mis documentos</div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl w-[90%] mx-auto max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Expediente Fiscal</DialogTitle></DialogHeader>
            <div className="space-y-6 py-4">
              <label className="cursor-pointer block">
                <div className="border-2 border-dashed border-primary/20 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 bg-primary/5">
                  <Upload className={`h-8 w-8 ${uploading ? 'animate-bounce' : 'text-primary/40'}`} />
                  <span className="text-xs font-bold text-primary/60">{uploading ? 'Subiendo...' : 'Subir nuevo'}</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </div>
              </label>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tus archivos</h3>
                {loadingFiles ? (
                  <p className="text-center text-xs text-muted-foreground animate-pulse">Cargando lista...</p>
                ) : archivos.length > 0 ? (
                  archivos.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-[10px] font-bold truncate">{file.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold"
                      onClick={async () => {

                        const { data, error } = await supabase.storage
                          .from('expedientes')
                          .createSignedUrl(file.name, 60);

                        if (error) {
                          toast({ title: "Error", description: "No se pudo generar el enlace", variant: "destructive" });
                        } else {
                          window.open(data.signedUrl, '_blank');
                        }
                      }}
                      >Ver</Button>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-muted-foreground italic">Expediente vacío.</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <button onClick={handleSignOut} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 font-extrabold text-destructive">
        <LogOut className="h-5 w-5" /> Cerrar sesión
      </button>
    </div>
  );
}