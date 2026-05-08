import { User, Store, Phone, FileText, LogOut, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNegocio } from "@/hooks/useNegocio";

const menuItems = [
  { icon: User, label: "Mi perfil fiscal", to: "/perfil/fiscal" },
  { icon: Store, label: "Mi negocio", to: "/preparar-negocio" },
  { icon: Phone, label: "Cambiar teléfono", to: null },
  { icon: FileText, label: "Mis documentos", to: null },
];

export default function Perfil() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { negocio } = useNegocio();
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("nombre").eq("id", user.id).maybeSingle()
      .then(({ data }) => data && setNombre(data.nombre));
  }, [user]);

  const initials = nombre
    ? nombre.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "··";

  const handleLogout = async () => {
    await signOut();
    toast.success("Hasta pronto");
    navigate("/auth");
  };

  return (
    <div className="px-4 pt-6 space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
          {initials}
        </div>
        <h1 className="mt-3 text-xl font-extrabold">{nombre || "Sin nombre"}</h1>
        <p className="text-muted-foreground text-sm">
          {negocio?.nombre_negocio ?? "Mi negocio"}
          {negocio?.ubicacion ? ` · ${negocio.ubicacion}` : ""}
        </p>
        <span className="mt-2 rounded-full bg-success-light px-3 py-1 text-xs font-bold text-success">
          RESICO activo
        </span>
      </div>

      <div className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => item.to && navigate(item.to)}
            disabled={!item.to}
            className="flex w-full items-center gap-3 rounded-xl bg-card p-4 shadow-sm transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <item.icon className="h-5 w-5 text-primary" />
            <span className="flex-1 text-left font-semibold">{item.label}</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        ))}
      </div>

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
