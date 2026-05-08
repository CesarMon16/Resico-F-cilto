import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Registrar from "./pages/Registrar";
import PrepararNegocio from "./pages/PrepararNegocio";
import PerfilFiscal from "./pages/PerfilFiscal";
import Historial from "./pages/Historial";
import Declaracion from "./pages/Declaracion";
import Creditos from "./pages/Creditos";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/preparar-negocio" element={<PrepararNegocio />} />
                <Route path="/registrar/:tipo" element={<Registrar />} />
                <Route path="/historial" element={<Historial />} />
                <Route path="/declaracion" element={<Declaracion />} />
                <Route path="/creditos" element={<Creditos />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/perfil/fiscal" element={<PerfilFiscal />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
