import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";

import Index from "./pages/Index";
import Registrar from "./pages/Registrar";
import Historial from "./pages/Historial";
import Declaracion from "./pages/Declaracion";
import Creditos from "./pages/Creditos";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500 animate-pulse text-lg">Cargando...</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Si no hay sesión, cualquier ruta redirige a Auth */}
            {!session ? (
              <>
                <Route path="/auth" element={<Auth />} />
                <Route path="*" element={<Navigate to="/auth" replace />} />
              </>
            ) : (
              /* Si hay sesión, habilitamos las rutas protegidas */
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/registrar/:tipo" element={<Registrar />} />
                <Route path="/historial" element={<Historial />} />
                <Route path="/declaracion" element={<Declaracion />} />
                <Route path="/creditos" element={<Creditos />} />
                <Route path="/perfil" element={<Perfil />} />
                {/* Redirigir de /auth a / si ya está logueado */}
                <Route path="/auth" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            )}
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
