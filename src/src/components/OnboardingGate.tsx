import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Decide a dónde mandar al usuario tras login según rol y estado de onboarding.
 * Rutas que NO se redirigen (siempre accesibles autenticado):
 *   /elegir-rol, /onboarding-contador, /preparar-negocio, /perfil*
 */
const PASS_PATHS = ["/elegir-rol", "/onboarding-contador", "/preparar-negocio"];

export function OnboardingGate() {
  const { user } = useAuth();
  const { roles, loading: rolesLoading, isContador } = useUserRole();
  const loc = useLocation();
  const [checking, setChecking] = useState(true);
  const [hasNegocio, setHasNegocio] = useState<boolean | null>(null);
  const [contadorListo, setContadorListo] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setChecking(true);
      const [{ data: neg }, { data: prof }] = await Promise.all([
        supabase.from("negocios").select("id").eq("usuario_id", user.id).limit(1).maybeSingle(),
        supabase.from("profiles").select("onboarding_completo").eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setHasNegocio(!!neg);
      setContadorListo(!!prof?.onboarding_completo);
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [user, loc.pathname]);

  if (rolesLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Cargando...
      </div>
    );
  }

  // Permitir libremente las pantallas de onboarding y perfil
  const isPass = PASS_PATHS.some((p) => loc.pathname.startsWith(p)) || loc.pathname.startsWith("/perfil");

  // 1. Sin rol → elegir rol
  if (roles.length === 0) {
    if (loc.pathname === "/elegir-rol") return <Outlet />;
    return <Navigate to="/elegir-rol" replace />;
  }

  // 2. Contador sin onboarding → onboarding-contador
  if (isContador && !contadorListo) {
    if (loc.pathname === "/onboarding-contador") return <Outlet />;
    return <Navigate to="/onboarding-contador" replace />;
  }

  // 3. Comerciante sin negocio → preparar-negocio
  if (!isContador && !hasNegocio) {
    if (loc.pathname === "/preparar-negocio") return <Outlet />;
    return <Navigate to="/preparar-negocio" replace />;
  }

  // 4. Si contador entra a "/" → mandar a /contador
  if (isContador && loc.pathname === "/") {
    return <Navigate to="/contador" replace />;
  }

  // 5. Si comerciante entra a /elegir-rol o /onboarding-contador ya teniendo todo
  if (!isContador && (loc.pathname === "/elegir-rol" || loc.pathname === "/onboarding-contador")) {
    return <Navigate to="/" replace />;
  }
  if (isContador && loc.pathname === "/elegir-rol") {
    return <Navigate to="/contador" replace />;
  }

  void isPass;
  return <Outlet />;
}
