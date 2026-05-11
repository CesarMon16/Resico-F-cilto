import { Navigate, Outlet } from "react-router-dom";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";

interface Props {
  allow: AppRole[];
  redirectTo?: string;
}

/** Protege rutas exigiendo que el usuario tenga al menos uno de los roles indicados. */
export function RoleRoute({ allow, redirectTo = "/" }: Props) {
  const { roles, loading } = useUserRole();
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Cargando...
      </div>
    );
  }
  const ok = roles.some((r) => allow.includes(r));
  if (!ok) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}
