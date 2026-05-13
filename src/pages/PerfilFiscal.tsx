import { useEffect, useState, forwardRef, cloneElement } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Loader2, User, FileText, Mail, Phone, MapPin, Calendar, Fingerprint, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PerfilSchema, type PerfilForm } from "@/validators/perfil.schema";
import { LIMITE_ANUAL_RESICO, formatMXN } from "@/lib/fiscal";

export default function PerfilFiscal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isValid, isDirty } } = useForm<PerfilForm>({
    resolver: zodResolver(PerfilSchema),
    mode: "onChange"
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("nombre, rfc, curp, correo, telefono, domicilio_fiscal, fecha_inicio_operaciones")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          reset({
            nombre: data.nombre ?? "",
            rfc: data.rfc ?? "",
            curp: data.curp ?? "",
            correo: data.correo ?? "",
            telefono: data.telefono ?? "",
            domicilio_fiscal: data.domicilio_fiscal ?? "",
            fecha_inicio_operaciones: data.fecha_inicio_operaciones ?? "",
          });
        }
        setLoading(false);
      });
  }, [user, reset]);

  const onSubmit = async (data: PerfilForm) => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nombre: data.nombre.trim(),
        rfc: data.rfc?.trim().toUpperCase() || null,
        curp: data.curp?.trim().toUpperCase() || null,
        correo: data.correo.trim(),
        telefono: data.telefono?.trim() || null,
        domicilio_fiscal: data.domicilio_fiscal?.trim() || null,
        fecha_inicio_operaciones: data.fecha_inicio_operaciones || null,
        regimen_fiscal: "RESICO_PF",
      })
      .eq("id", user.id);
    
    setBusy(false);
    if (error) {
      toast.error("No se pudo guardar los cambios");
      return;
    }
    toast.success("Perfil fiscal actualizado correctamente");
    navigate("/perfil");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-6 animate-slide-up pb-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground font-semibold">
        <ArrowLeft className="h-5 w-5" /> Regresar
      </button>

      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Mi perfil fiscal</h1>
        <p className="text-sm text-muted-foreground">
          Información oficial para tus reportes y declaraciones ante el SAT.
        </p>
      </div>

      <div className="rounded-2xl bg-success/10 p-4 border border-success/20">
        <div className="flex items-center gap-2 text-success">
          <ShieldCheck className="h-5 w-5" />
          <p className="font-bold">Régimen: RESICO Persona Física</p>
        </div>
        <p className="text-muted-foreground text-xs mt-1 ml-7">
          Límite anual de ingresos: <span className="font-semibold text-foreground">{formatMXN(LIMITE_ANUAL_RESICO)}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FormSection title="Datos Personales">
          <FormField
            label="Nombre completo"
            icon={<User />}
            error={errors.nombre}
            {...register("nombre")}
            placeholder="Como aparece en tu INE"
          />
          <FormField
            label="Correo electrónico"
            icon={<Mail />}
            type="email"
            error={errors.correo}
            {...register("correo")}
            placeholder="tucorreo@ejemplo.com"
          />
          <FormField
            label="Teléfono (10 dígitos)"
            icon={<Phone />}
            error={errors.telefono}
            {...register("telefono")}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
              e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
            }}
            placeholder="Ej: 5512345678"
          />
        </FormSection>

        <FormSection title="Identificación Fiscal">
          <FormField
            label="RFC"
            icon={<FileText />}
            error={errors.rfc}
            {...register("rfc")}
            placeholder="13 caracteres"
            help="Consúltalo en tu Constancia de Situación Fiscal"
          />
          <FormField
            label="CURP"
            icon={<Fingerprint />}
            error={errors.curp}
            {...register("curp")}
            placeholder="18 caracteres"
          />
        </FormSection>

        <FormSection title="Detalles Operativos">
          <FormField
            label="Domicilio fiscal"
            icon={<MapPin />}
            error={errors.domicilio_fiscal}
            {...register("domicilio_fiscal")}
            placeholder="Calle, número, colonia, CP"
          />
          <FormField
            label="Inicio de operaciones"
            icon={<Calendar />}
            type="date"
            error={errors.fecha_inicio_operaciones}
            {...register("fecha_inicio_operaciones")}
          />
        </FormSection>

        <button
          type="submit"
          disabled={busy || !isValid || !isDirty}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary p-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {busy ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 pt-2">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 px-1">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

const FormField = forwardRef(({ label, icon, error, help, ...props }: any, ref: any) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
        {cloneElement(icon, { size: 18 })}
      </div>
      <input
        {...props}
        ref={ref}
        className={`w-full rounded-xl border bg-card p-3.5 pl-11 outline-none transition-all focus:ring-2 ${
          error ? "border-destructive ring-destructive/20" : "border-input focus:ring-primary/20"
        }`}
      />
    </div>
    {error && <p className="text-xs text-destructive font-medium ml-1">⚠️ {error.message}</p>}
    {help && !error && <p className="text-[11px] text-muted-foreground ml-1">{help}</p>}
  </div>
));

FormField.displayName = "FormField";
