import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Auth() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { nombre },
          },
        });
        if (error) throw error;
        toast.success("¡Cuenta creada! Bienvenido 🎉");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("¡Hola de nuevo!");
      }
    } catch (err: any) {
      const msg = err?.message ?? "Algo salió mal";
      if (msg.includes("Invalid login")) toast.error("Correo o contraseña incorrectos");
      else if (msg.includes("already registered")) toast.error("Este correo ya está registrado");
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl">
            💼
          </div>
          <h1 className="mt-4 text-2xl font-extrabold">Resico Facilito</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "login" ? "Entra a tu cuenta" : "Crea tu cuenta en 1 minuto"}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="mb-1.5 block text-sm font-bold">¿Cómo te llamas?</label>
              <input
                required
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                className="w-full rounded-xl border border-input bg-card p-4 outline-none ring-ring focus:ring-2"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-bold">Correo electrónico</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="w-full rounded-xl border border-input bg-card p-4 outline-none ring-ring focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold">Contraseña</label>
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-xl border border-input bg-card p-4 outline-none ring-ring focus:ring-2"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary p-4 text-lg font-bold text-primary-foreground shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? "Un momento..." : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="w-full text-center text-sm font-semibold text-primary"
        >
          {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Entra"}
        </button>
      </div>
    </div>
  );
}
