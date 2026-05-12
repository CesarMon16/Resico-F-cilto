import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, MapPin, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";


export default function PrepararNegocio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("negocios")
      .select("id, nombre_negocio, giro, ubicacion")
      .eq("usuario_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingId(data.id);
          setNombre(data.nombre_negocio);
          setUbicacion(data.ubicacion || "");
        }
        setChecking(false);
      });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("Escribe el nombre de tu negocio");
      return;
    }
    if (!user) return;
    setBusy(true);
    const payload = {
      nombre_negocio: nombre.trim(),
      ubicacion: ubicacion.trim() || null,
    };
    const { error } = existingId
      ? await supabase.from("negocios").update(payload).eq("id", existingId)
      : await supabase.from("negocios").insert({ usuario_id: user.id, ...payload });
    setBusy(false);
    if (error) {
      toast.error("No se pudo guardar. Intenta otra vez");
      return;
    }
    toast.success(existingId ? "Negocio actualizado" : "¡Listo! Tu negocio está preparado");
    navigate("/", { replace: true });
  };

  if (checking) {
    return <p className="px-4 pt-10 text-center text-muted-foreground">Cargando...</p>;
  }

  return (
    <div className="px-4 pt-6 space-y-6 animate-slide-up">
      <div className="rounded-2xl bg-primary/10 p-6">
        <h1 className="text-2xl font-extrabold">
          {existingId ? "🏪 Mi negocio" : "👋 Vamos a preparar tu negocio"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {existingId
            ? "Actualiza los datos de tu negocio cuando quieras."
            : "Cuéntanos un poquito para empezar a registrar tus ventas y gastos."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block font-bold">¿Cómo se llama tu negocio?</label>
          <div className="relative">
            <Store className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Ej: Tortillería Doña Mari"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl border border-input bg-card p-4 pl-12 text-base outline-none ring-ring focus:ring-2"
            />
          </div>
        </div>


        <div>
          <label className="mb-2 block font-bold">¿Dónde está? (opcional)</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Ej: Mercado Hidalgo, Puebla"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              className="w-full rounded-xl border border-input bg-card p-4 pl-12 text-base outline-none ring-ring focus:ring-2"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-primary p-4 text-lg font-bold text-primary-foreground shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "Guardando..." : "Empezar"}
        </button>
      </form>
    </div>
  );
}
