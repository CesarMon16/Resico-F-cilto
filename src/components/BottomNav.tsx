import { Home, Sparkles, Clock, FileText, User, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

const itemsComerciante = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/asistente", icon: Sparkles, label: "Asistente" },
  { to: "/historial", icon: Clock, label: "Historial" },
  { to: "/declaracion", icon: FileText, label: "Declarar" },
  { to: "/perfil", icon: User, label: "Perfil" },
];

const itemsContador = [
  { to: "/contador", icon: Users, label: "Clientes" },
  { to: "/perfil", icon: User, label: "Perfil" },
];

export function BottomNav() {
  const { isContador } = useUserRole();
  const navItems = isContador ? itemsContador : itemsComerciante;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/" || item.to === "/contador"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-semibold transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <item.icon className="h-6 w-6" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
