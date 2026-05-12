import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OnboardingGate } from "@/components/OnboardingGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RoleRoute } from "@/components/RoleRoute";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Registrar from "./pages/Registrar";
import PrepararNegocio from "./pages/PrepararNegocio";
import ElegirRol from "./pages/ElegirRol";
import OnboardingContador from "./pages/OnboardingContador";
import Asistente from "./pages/Asistente";
import PerfilFiscal from "./pages/PerfilFiscal";
import Historial from "./pages/Historial";
import Declaracion from "./pages/Declaracion";
import HistorialFiscal from "./pages/HistorialFiscal";
import ContadorCliente from "./pages/ContadorCliente";
import Expediente from "./pages/Expediente";
import Creditos from "./pages/Creditos";
import Contador from "./pages/Contador";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<OnboardingGate />}>
                  <Route path="/elegir-rol" element={<ElegirRol />} />
                  <Route path="/onboarding-contador" element={<OnboardingContador />} />
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/preparar-negocio" element={<PrepararNegocio />} />
                    <Route path="/asistente" element={<Asistente />} />
                    <Route path="/registrar/:tipo" element={<Registrar />} />
                    <Route path="/historial" element={<Historial />} />
                    <Route path="/declaracion" element={<Declaracion />} />
                    <Route path="/expediente" element={<Expediente />} />
                    <Route path="/creditos" element={<Creditos />} />
                    {/* Rutas de contador protegidas por rol */}
                    <Route element={<RoleRoute allow={["CONTADOR", "ADMIN"]} />}>
                      <Route path="/contador" element={<Contador />} />
                      <Route path="/contador/:clienteId" element={<ContadorCliente />} />
                    </Route>
                    <Route path="/historial-fiscal" element={<HistorialFiscal />} />
                    <Route path="/perfil" element={<Perfil />} />
                    <Route path="/perfil/fiscal" element={<PerfilFiscal />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
