import { Shield, Users, BarChart3, Settings, Activity, FileText } from "lucide-react";
import { MenuItem, SectionTitle } from "./MenuItem";

export function AdminProfileView() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-primary/10 border border-primary/20 p-5 flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" />
        <div>
          <p className="font-extrabold">Panel de administración</p>
          <p className="text-xs text-muted-foreground">Gestión y métricas globales</p>
        </div>
      </div>

      <div className="space-y-2">
        <SectionTitle>Gestión</SectionTitle>
        <MenuItem icon={<Users className="h-5 w-5" />} label="Usuarios y contadores" hint="Próximamente" />
        <MenuItem icon={<BarChart3 className="h-5 w-5" />} label="Métricas globales" hint="Próximamente" />
        <MenuItem icon={<Activity className="h-5 w-5" />} label="Actividad reciente" hint="Próximamente" />
        <MenuItem icon={<FileText className="h-5 w-5" />} label="Auditoría" hint="Próximamente" />
        <MenuItem icon={<Settings className="h-5 w-5" />} label="Configuración fiscal" hint="Próximamente" />
      </div>
    </div>
  );
}
