import { User, Store, Phone, FileText, LogOut, ChevronRight } from "lucide-react";

const menuItems = [
  { icon: User, label: "Mis datos personales" },
  { icon: Store, label: "Mi negocio" },
  { icon: Phone, label: "Cambiar teléfono" },
  { icon: FileText, label: "Mis documentos" },
];

export default function Perfil() {
  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
          MG
        </div>
        <h1 className="mt-3 text-xl font-extrabold">María García</h1>
        <p className="text-muted-foreground text-sm">Abarrotes García · Oaxaca</p>
        <span className="mt-2 rounded-full bg-success-light px-3 py-1 text-xs font-bold text-success">
          RESICO activo
        </span>
      </div>

      {/* Menu */}
      <div className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className="flex w-full items-center gap-3 rounded-xl bg-card p-4 shadow-sm transition-colors hover:bg-muted"
          >
            <item.icon className="h-5 w-5 text-primary" />
            <span className="flex-1 text-left font-semibold">{item.label}</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 p-4 font-bold text-destructive transition-colors hover:bg-destructive/10">
        <LogOut className="h-5 w-5" />
        Cerrar sesión
      </button>
    </div>
  );
}
