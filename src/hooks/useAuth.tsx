<<<<<<< HEAD
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
=======
import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { auditLog } from "@/lib/auditoria";
>>>>>>> Facilito_alpha

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ session: null, user: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD

  useEffect(() => {
    // Listener FIRST, then getSession (per Lovable Cloud guidance)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
=======
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      // Auditoría LOGIN/LOGOUT (sin bloquear UI)
      if (event === "SIGNED_IN" && s?.user && lastUserId.current !== s.user.id) {
        lastUserId.current = s.user.id;
        setTimeout(() => { void auditLog("LOGIN"); }, 0);
      } else if (event === "SIGNED_OUT") {
        lastUserId.current = null;
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) lastUserId.current = data.session.user.id;
>>>>>>> Facilito_alpha
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
<<<<<<< HEAD
=======
    void auditLog("LOGOUT");
>>>>>>> Facilito_alpha
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
