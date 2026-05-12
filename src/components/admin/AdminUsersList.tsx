import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SpinnerInline } from "@/components/SkeletonCard";
import { Search, UserCheck } from "lucide-react";

interface UserProfile {
  id: string;
  nombre: string;
  correo: string;
  rfc: string;
  role: "USUARIO" | "CONTADOR" | "ADMIN";
}

export function AdminUsersList() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    
    // Obtenemos los perfiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, nombre, correo, rfc");

    if (profilesError) {
      toast.error("Error al cargar perfiles");
      console.error(profilesError);
      setLoading(false);
      return;
    }

    // Obtenemos los roles por separado porque ambas apuntan a auth.users, no entre sí directamente
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      console.error(rolesError);
    }

    const formatted = (profilesData as { id: string; nombre: string | null; correo: string | null; rfc: string | null }[]).map((d) => {
      const userRole = rolesData?.find((r) => r.user_id === d.id);
      return {
        id: d.id,
        nombre: d.nombre || "Sin nombre",
        correo: d.correo || "Sin correo",
        rfc: d.rfc || "Sin RFC",
        role: (userRole ? userRole.role : "USUARIO") as UserProfile["role"],
      };
    });

    setUsers(formatted);
    setLoading(false);
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    const loadingToast = toast.loading("Actualizando rol...");
    try {
      // Hacemos un upsert: si el registro del rol no existe, lo crea. Si existe, lo actualiza.
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: newRole }, { onConflict: "user_id" });

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole as UserProfile["role"] } : u))
      );
      toast.success("Rol actualizado correctamente", { id: loadingToast });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      console.error(err);
      toast.error("Error al actualizar: " + msg, { id: loadingToast });
    }
  };

  const filtered = users.filter(
    (u) =>
      u.nombre.toLowerCase().includes(q.toLowerCase()) ||
      u.correo.toLowerCase().includes(q.toLowerCase()) ||
      u.rfc.toLowerCase().includes(q.toLowerCase())
  );

  if (loading) {
    return (
      <div className="py-10 text-center">
        <SpinnerInline />
        <p className="mt-2 text-sm text-muted-foreground font-semibold">Cargando directorio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o correo..."
          className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2.5 text-sm outline-none ring-ring focus:ring-2"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((u) => (
          <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-card shadow-sm">
            <div className="min-w-0 flex-1">
              <p className="font-bold truncate">{u.nombre}</p>
              <p className="text-xs text-muted-foreground truncate">{u.correo}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{u.rfc}</p>
            </div>
            
            <div className="w-full sm:w-36 shrink-0">
              <Select value={u.role} onValueChange={(val) => handleRoleChange(u.id, val)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USUARIO">Usuario</SelectItem>
                  <SelectItem value="CONTADOR">Contador</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <UserCheck className="mx-auto h-10 w-10 mb-2 opacity-20" />
            <p>No se encontraron coincidencias</p>
          </div>
        )}
      </div>
    </div>
  );
}
