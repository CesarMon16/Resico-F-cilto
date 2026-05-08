import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "USUARIO" | "CONTADOR" | "ADMIN";

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancelled) return;
      setRoles((data ?? []).map((r: any) => r.role as AppRole));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return {
    roles,
    loading,
    isContador: roles.includes("CONTADOR") || roles.includes("ADMIN"),
    isAdmin: roles.includes("ADMIN"),
  };
}
