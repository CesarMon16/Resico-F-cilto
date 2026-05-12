import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function OnboardingContador() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [nombre, setNombre] = useState("");
  const [despacho, setDespacho] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [experiencia, setExperiencia] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!nombre.trim()) {
      toast.error("Dinos cómo te llamas");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nombre: nombre.trim(),
        despacho: despacho.trim() || null,
        telefono: telefono.trim() || null,
        ciudad: ciudad.trim() || null,
        experiencia_anios: experiencia ? Number(experiencia) : null,
        onboarding_completo: true,
      })
      .eq("id", user.id);
    if (error) {
      setLoading(false);
      toast.error("No se pudo guardar. Intenta de nuevo.");
      return;
    }
    toast.success("¡Listo! Bienvenido 👋");
    // Recarga completa para que el gate revalide con datos frescos
    window.location.assign("/contador");
  }

  return (
    <div className="px-4 pt-8 space-y-6">
      <div>
        <p className="text-3xl">🧮</p>
        <h1 className="text-2xl font-extrabold mt-2">Cuéntanos un poco de ti</h1>
        <p className="text-muted-foreground text-sm">
          Solo lo esencial para personalizar tu experiencia.
        </p>
      </div>

      <form onSubmit={guardar} className="space-y-4">
        <Field label="Tu nombre *" value={nombre} onChange={setNombre} placeholder="Ej. Juan Pérez" />
        <Field label="Nombre del despacho (opcional)" value={despacho} onChange={setDespacho} placeholder="Ej. Despacho Pérez" />
        <Field label="Teléfono (opcional)" value={telefono} onChange={setTelefono} placeholder="10 dígitos" type="tel" />
        <Field label="Ciudad (opcional)" value={ciudad} onChange={setCiudad} placeholder="Ej. Monterrey" />
        <Field label="Años de experiencia (opcional)" value={experiencia} onChange={setExperiencia} placeholder="Ej. 5" type="number" />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-primary py-4 font-extrabold text-primary-foreground shadow-md transition-opacity disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Continuar"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-input bg-card p-3 outline-none focus:ring-2 ring-ring"
      />
    </div>
  );
}
