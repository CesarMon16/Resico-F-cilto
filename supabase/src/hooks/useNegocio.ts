import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Negocio {
  id: string;
  nombre_negocio: string;
  giro: string | null;
  ubicacion: string | null;
}

/**
 * Returns the user's primary business, auto-creating a default one on first use.
 * Keeps onboarding zero-friction for low tech-literacy users.
 */
export function useNegocio() {
  const { user } = useAuth();
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNegocio(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("negocios")
        .select("id, nombre_negocio, giro, ubicacion")
        .eq("usuario_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      setNegocio(data ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { negocio, loading };
}
