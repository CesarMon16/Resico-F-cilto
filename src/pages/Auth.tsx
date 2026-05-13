import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock, User, Loader2, ShieldCheck, ArrowRight } from "lucide-react";

/**
 * Esquema de validación estricta para Autenticación.
 * Blindaje: Email formal y contraseña mínima de 6 caracteres.
 */
const AuthSchema = z.object({
  email: z.string().trim().email("Ingresa un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  nombre: z.string().trim().min(2, "El nombre es obligatorio").optional().or(z.literal("")),
});

type AuthForm = z.infer<typeof AuthSchema>;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isValid } } = useForm<AuthForm>({
    resolver: zodResolver(AuthSchema),
    mode: "onChange"
  });

  const onSubmit = async (data: AuthForm) => {
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        toast.success("¡Bienvenido de nuevo!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: { nombre: data.nombre },
          },
        });
        if (error) throw error;
        toast.success("¡Cuenta creada! Revisa tu correo.");
        setIsLogin(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            {isLogin ? "Inicia Sesión" : "Crea tu Cuenta"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin 
              ? "Gestiona tus impuestos de forma inteligente" 
              : "La plataforma de asistencia fiscal para RESICO"}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-sm font-semibold ml-1">Nombre Completo</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  {...register("nombre")}
                  placeholder="Tu nombre"
                  className={`w-full rounded-2xl border bg-card p-4 pl-10 outline-none transition-all focus:ring-2 ${
                    errors.nombre ? "border-destructive ring-destructive/20" : "border-input focus:ring-primary/20"
                  }`}
                />
              </div>
              {errors.nombre && <p className="text-xs text-destructive mt-1 ml-1">{errors.nombre.message}</p>}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-semibold ml-1">Correo Electrónico</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                {...register("email")}
                placeholder="ejemplo@correo.com"
                className={`w-full rounded-2xl border bg-card p-4 pl-10 outline-none transition-all focus:ring-2 ${
                  errors.email ? "border-destructive ring-destructive/20" : "border-input focus:ring-primary/20"
                }`}
              />
            </div>
            {errors.email && <p className="text-xs text-destructive mt-1 ml-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold ml-1">Contraseña</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="password"
                {...register("password")}
                placeholder="••••••••"
                className={`w-full rounded-2xl border bg-card p-4 pl-10 outline-none transition-all focus:ring-2 ${
                  errors.password ? "border-destructive ring-destructive/20" : "border-input focus:ring-primary/20"
                }`}
              />
            </div>
            {errors.password && <p className="text-xs text-destructive mt-1 ml-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
              <>
                {isLogin ? "Entrar" : "Registrarme"}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-4">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-medium text-primary hover:underline transition-all"
          >
            {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
