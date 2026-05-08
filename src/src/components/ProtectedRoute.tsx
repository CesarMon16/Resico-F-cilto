import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Cargando...
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace state={{ from: loc }} />;
  return <Outlet />;
}
