import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { UserProfileView } from "@/components/perfil/UserProfileView";
import { AccountantProfileView } from "@/components/perfil/AccountantProfileView";
import { AdminProfileView } from "@/components/perfil/AdminProfileView";
import { SectionTitle } from "@/components/perfil/MenuItem";
import { FiscalProgress } from "@/components/perfil/FiscalProgress";

export default function Perfil() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isContador, isAdmin, loading: rolesLoading } = useUserRole();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [despacho, setDespacho] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("nombre, correo, despacho")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setNombre(data.nombre ?? "");
        setCorreo(data.correo ?? "");
        setDespacho(data.despacho ?? null);
      });
  }, [user]);

  const initials = nombre
    ? nombre.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "··";

  const handleLogout = async () => {
    await signOut();
    toast.success("Hasta pronto");
    navigate("/auth");
  };

  // Etiqueta de rol y subtítulo del header (cambia por contexto)
  let rolLabel = "RESICO activo";
  let rolColor = "bg-success-light text-success";
  let subtitulo: string | null = null;

  if (isAdmin) {
    rolLabel = "Administrador";
    rolColor = "bg-primary/15 text-primary";
    subtitulo = correo;
  } else if (isContador) {
    rolLabel = "Contador";
    rolColor = "bg-accent/20 text-accent";
    subtitulo = despacho ?? "Despacho independiente";
  }

  return (
    <div className="px-4 pt-6 space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
          {initials}
        </div>
        <h1 className="mt-3 text-xl font-extrabold">{nombre || "Sin nombre"}</h1>
        {subtitulo && <p className="text-muted-foreground text-sm">{subtitulo}</p>}
        <span className={`mt-2 rounded-full px-3 py-1 text-xs font-bold ${rolColor}`}>
          {rolLabel}
        </span>
      </div>

      {rolesLoading ? (
        <p className="text-center text-muted-foreground">Cargando...</p>
      ) : isAdmin ? (
        <AdminProfileView />
      ) : isContador ? (
        <AccountantProfileView />
      ) : (
        <>
          <FiscalProgress />
          <UserProfileView />
        </>
      )
      }

      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 p-4 font-bold text-destructive transition-colors hover:bg-destructive/10"
      >
        <LogOut className="h-5 w-5" />
        Cerrar sesión
      </button>


    </div>
  );
}
