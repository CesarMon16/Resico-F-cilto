import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { validarRFC, LIMITE_ANUAL_RESICO, formatMXN } from "@/lib/fiscal";

interface FormState {
  nombre: string;
  rfc: string;
  curp: string;
  actividad_economica: string;
  correo: string;
  telefono: string;
  domicilio_fiscal: string;
  fecha_inicio_operaciones: string;
}

const EMPTY: FormState = {
  nombre: "",
  rfc: "",
  curp: "",
  actividad_economica: "",
  correo: "",
  telefono: "",
  domicilio_fiscal: "",
  fecha_inicio_operaciones: "",
};

export default function PerfilFiscal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("nombre, rfc, curp, actividad_economica, correo, telefono, domicilio_fiscal, fecha_inicio_operaciones")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            nombre: data.nombre ?? "",
            rfc: data.rfc ?? "",
            curp: data.curp ?? "",
            actividad_economica: data.actividad_economica ?? "",
            correo: data.correo ?? "",
            telefono: data.telefono ?? "",
            domicilio_fiscal: data.domicilio_fiscal ?? "",
            fecha_inicio_operaciones: data.fecha_inicio_operaciones ?? "",
          });
        }
        setLoading(false);
      });
  }, [user]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.nombre.trim()) {
      toast.error("Tu nombre es obligatorio");
      return;
    }
    if (form.rfc && !validarRFC(form.rfc)) {
      toast.error("El RFC no tiene un formato válido");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nombre: form.nombre.trim(),
        rfc: form.rfc.trim().toUpperCase() || null,
        curp: form.curp.trim().toUpperCase() || null,
        actividad_economica: form.actividad_economica.trim() || null,
        correo: form.correo.trim() || null,
        telefono: form.telefono.trim() || null,
        domicilio_fiscal: form.domicilio_fiscal.trim() || null,
        fecha_inicio_operaciones: form.fecha_inicio_operaciones || null,
        regimen_fiscal: "RESICO_PF",
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    toast.success("Perfil fiscal guardado");
    navigate("/perfil");
  };

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="px-4 pt-6 space-y-6 animate-slide-up">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground font-semibold">
        <ArrowLeft className="h-5 w-5" /> Regresar
      </button>

      <div>
        <h1 className="text-2xl font-extrabold">Mi perfil fiscal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estos datos aparecen en tus reportes y declaraciones.
        </p>
      </div>

      <div className="rounded-xl bg-success-light p-3 text-sm">
        <p className="font-bold text-success">Régimen: RESICO Persona Física</p>
        <p className="text-muted-foreground text-xs mt-0.5">
          Límite anual de ingresos: {formatMXN(LIMITE_ANUAL_RESICO)}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nombre completo *" value={form.nombre} onChange={(v) => set("nombre", v)} placeholder="Como aparece en tu INE" />
        <Field
          label="RFC"
          value={form.rfc}
          onChange={(v) => set("rfc", v.toUpperCase())}
          placeholder="13 caracteres"
          maxLength={13}
          help="Lo encuentras en tu Constancia de Situación Fiscal"
        />
        <Field label="CURP" value={form.curp} onChange={(v) => set("curp", v.toUpperCase())} placeholder="18 caracteres" maxLength={18} />
        <Field label="Actividad económica" value={form.actividad_economica} onChange={(v) => set("actividad_economica", v)} placeholder="Ej: Venta de comida, Servicios de belleza" />
        <Field label="Correo electrónico" value={form.correo} onChange={(v) => set("correo", v)} placeholder="tucorreo@ejemplo.com" type="email" />
        <Field label="Teléfono" value={form.telefono} onChange={(v) => set("telefono", v)} placeholder="10 dígitos" />
        <Field label="Domicilio fiscal" value={form.domicilio_fiscal} onChange={(v) => set("domicilio_fiscal", v)} placeholder="Calle, número, colonia" />
        <Field label="Fecha de inicio de operaciones" value={form.fecha_inicio_operaciones} onChange={(v) => set("fecha_inicio_operaciones", v)} type="date" />

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary p-4 text-lg font-bold text-primary-foreground shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <Save className="h-5 w-5" />
          {busy ? "Guardando..." : "Guardar"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", maxLength, help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  help?: string;
}) {
  return (
    <div>
      <label className="mb-1 block font-semibold text-sm">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-xl border border-input bg-card p-3 outline-none ring-ring focus:ring-2"
      />
      {help && <p className="mt-1 text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}
