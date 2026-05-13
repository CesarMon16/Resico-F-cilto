import { ArrowLeft, User, Briefcase, Phone, MapPin, Calendar, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { useState, forwardRef, cloneElement } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PerfilSchema, type PerfilForm } from "@/validators/perfil.schema";

export default function OnboardingContador() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors, isValid } } = useForm<PerfilForm>({
    resolver: zodResolver(PerfilSchema),
    mode: "onChange",
    defaultValues: {
      nombre: "",
      despacho: "",
      telefono: "",
      ciudad: "",
      experiencia_anios: 0,
      correo: user?.email || ""
    }
  });

  async function onSubmit(data: PerfilForm) {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nombre: data.nombre.trim(),
        despacho: data.despacho?.trim() || null,
        telefono: data.telefono?.trim() || null,
        ciudad: data.ciudad?.trim() || null,
        experiencia_anios: data.experiencia_anios,
        onboarding_completo: true,
      })
      .eq("id", user.id);

    if (error) {
      setLoading(false);
      toast.error("No pudimos guardar tu perfil. Revisa los datos.");
      return;
    }
    toast.success("¡Perfil completado con éxito! Bienvenido.");
    window.location.assign("/contador");
  }

  return (
    <div className="px-4 pt-8 pb-12 space-y-8 animate-slide-up bg-background min-h-screen">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground font-semibold hover:text-foreground transition-colors">
        <ArrowLeft className="h-5 w-5" /> Regresar
      </button>

      <div className="relative">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-4">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Crea tu perfil profesional</h1>
        <p className="text-muted-foreground mt-2">
          Queremos conocerte para conectar mejor con tus futuros clientes.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <div className="grid gap-5">
          <FormField
            label="Tu nombre completo"
            icon={<User />}
            error={errors.nombre}
            {...register("nombre")}
            placeholder="Ej. Juan Pérez"
          />

          <FormField
            label="Nombre del despacho (opcional)"
            icon={<Briefcase />}
            error={errors.despacho}
            {...register("despacho")}
            placeholder="Ej. Consultoría Fiscal Integral"
          />

          <FormField
            label="Teléfono de contacto (10 dígitos)"
            icon={<Phone />}
            error={errors.telefono}
            {...register("telefono")}
            placeholder="Ej. 5512345678"
          />

          <FormField
            label="Ciudad de residencia"
            icon={<MapPin />}
            error={errors.ciudad}
            {...register("ciudad")}
            placeholder="Ej. Monterrey, N.L."
          />

          <FormField
            label="Años de experiencia"
            icon={<Calendar />}
            type="number"
            error={errors.experiencia_anios}
            {...register("experiencia_anios")}
            placeholder="Ej. 5"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !isValid}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-5 text-lg font-extrabold text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              Continuar y Guardar
              <CheckCircle2 className="h-5 w-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

const FormField = forwardRef(({ label, icon, error, ...props }: any, ref: any) => (
  <div className="space-y-1.5">
    <label className="text-sm font-bold ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
        {cloneElement(icon, { size: 18 })}
      </div>
      <input
        {...props}
        ref={ref}
        className={`w-full rounded-2xl border bg-card p-4 pl-11 outline-none transition-all focus:ring-2 ${
          error ? "border-destructive ring-destructive/20" : "border-input focus:ring-primary/20"
        }`}
      />
    </div>
    {error && <p className="text-xs text-destructive font-medium ml-1">⚠️ {error.message}</p>}
  </div>
));

FormField.displayName = "FormField";
