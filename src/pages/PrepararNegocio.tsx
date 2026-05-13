import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Store, MapPin, Briefcase, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NegocioSchema, type NegocioInput } from "@/validators/negocio.schema";

const giros = ["Tienda", "Comida", "Servicios", "Ropa", "Otro"];

export default function PrepararNegocio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingId, setExistingId] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isValid } } = useForm<NegocioInput>({
    resolver: zodResolver(NegocioSchema),
    mode: "onChange",
    defaultValues: {
      nombre_negocio: "",
      giro: "Tienda",
      ubicacion: ""
    }
  });

  const giroWatch = watch("giro");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("negocios")
        .select("id, nombre_negocio, giro, ubicacion")
        .eq("usuario_id", user.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("actividad_economica")
        .eq("id", user.id)
        .maybeSingle()
    ]).then(([negocioRes, profileRes]) => {
      const n = negocioRes.data;
      const p = profileRes.data;
      if (n) {
        setExistingId(n.id);
        reset({
          nombre_negocio: n.nombre_negocio,
          giro: n.giro || "Tienda",
          ubicacion: n.ubicacion || "",
          actividad_economica: p?.actividad_economica || ""
        });
      } else if (p) {
        reset({
          nombre_negocio: "",
          giro: "Tienda",
          ubicacion: "",
          actividad_economica: p.actividad_economica || ""
        });
      }
      setChecking(false);
    });
  }, [user, reset]);

  const onSubmit = async (data: NegocioInput) => {
    if (!user) return;
    setBusy(true);
    
    // Update Negocio
    const payload = {
      nombre_negocio: data.nombre_negocio.trim(),
      giro: data.giro,
      ubicacion: data.ubicacion?.trim() || null,
    };
    
    const { error: nErr } = existingId
      ? await supabase.from("negocios").update(payload).eq("id", existingId)
      : await supabase.from("negocios").insert({ usuario_id: user.id, ...payload });

    // Update Profile (Actividad Económica)
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ actividad_economica: data.actividad_economica?.trim() || null })
      .eq("id", user.id);
    
    setBusy(false);
    if (nErr || pErr) {
      toast.error("No se pudo guardar la información");
      return;
    }
    toast.success(existingId ? "Actividad actualizada" : "¡Todo listo! Actividad preparada");
    navigate("/", { replace: true });
  };

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-6 animate-slide-up pb-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground font-semibold">
        <ArrowLeft className="h-5 w-5" /> Regresar
      </button>

      <div className="rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 p-8 border border-primary/10 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">
            {existingId ? "Tu Actividad" : "Prepara tu Actividad"}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-[240px]">
            {existingId
              ? "Mantén actualizados los datos de tu negocio."
              : "Comencemos configurando lo esencial para tus registros."}
          </p>
        </div>
        <Sparkles className="absolute right-[-10px] bottom-[-10px] h-32 w-32 text-primary/10 rotate-12" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold ml-1">¿Cómo se llama tu actividad?</label>
          <div className="relative group">
            <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              {...register("nombre_negocio")}
              placeholder="Ej: Abarrotes 'La Esperanza'"
              className={`w-full rounded-2xl border bg-card p-4 pl-12 text-base outline-none transition-all focus:ring-2 ${
                errors.nombre_negocio ? "border-destructive ring-destructive/20" : "border-input focus:ring-primary/20"
              }`}
            />
          </div>
          {errors.nombre_negocio && <p className="text-xs text-destructive font-medium ml-1">⚠️ {errors.nombre_negocio.message}</p>}
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold ml-1">¿A qué se dedica principalmente?</label>
          <div className="grid grid-cols-3 gap-2">
            {giros.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setValue("giro", g, { shouldDirty: true, shouldValidate: true })}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-xs font-bold transition-all border ${
                  giroWatch === g
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                    : "bg-card text-muted-foreground border-input hover:border-primary/40"
                }`}
              >
                <Briefcase className="h-5 w-5" />
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold ml-1">¿Dónde se ubica? (Opcional)</label>
          <div className="relative group">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              {...register("ubicacion")}
              placeholder="Ej: Centro, CDMX"
              className={`w-full rounded-2xl border bg-card p-4 pl-12 text-base outline-none transition-all focus:ring-2 ${
                errors.ubicacion ? "border-destructive ring-destructive/20" : "border-input focus:ring-primary/20"
              }`}
            />
          </div>
          {errors.ubicacion && <p className="text-xs text-destructive font-medium ml-1">⚠️ {errors.ubicacion.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold ml-1">Actividad económica detallada</label>
          <div className="relative group">
            <Briefcase className="absolute left-4 top-4 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <textarea
              {...register("actividad_economica")}
              placeholder="Describe detalladamente qué haces (ej: Venta de frutas y verduras al por menor)"
              rows={3}
              className={`w-full rounded-2xl border bg-card p-4 pl-12 text-base outline-none transition-all focus:ring-2 ${
                errors.actividad_economica ? "border-destructive ring-destructive/20" : "border-input focus:ring-primary/20"
              }`}
            />
          </div>
          {errors.actividad_economica && <p className="text-xs text-destructive font-medium ml-1">⚠️ {errors.actividad_economica.message}</p>}
          <p className="text-[10px] text-muted-foreground ml-1">
            Esta información es necesaria para tus declaraciones oficiales.
          </p>
        </div>

        <button
          type="submit"
          disabled={busy || !isValid}
          className="w-full rounded-2xl bg-primary p-4 text-lg font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Guardando...
            </span>
          ) : (
            existingId ? "Actualizar" : "Comenzar"
          )}
        </button>
      </form>
    </div>
  );
}
