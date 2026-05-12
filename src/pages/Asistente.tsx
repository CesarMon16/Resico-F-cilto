import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNegocio } from "@/hooks/useNegocio";

const SUGERENCIAS = [
  "Hoy vendí 350 pesos en efectivo",
  "Compré 120 de papelería sin factura",
  "¿Cuánto llevo este mes?",
];

const BIENVENIDA: UIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "¡Hola! 👋 Soy tu asistente. Cuéntame qué vendiste o compraste hoy y yo lo anoto por ti. También puedo decirte cuánto llevas este mes.",
    },
  ],
};

export default function Asistente() {
  const { negocio, loading } = useNegocio();
  const [input, setInput] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
  }, []);

  const chat = useChat({
    id: negocio?.id ?? "no-negocio",
    messages: [BIENVENIDA],
    transport: new DefaultChatTransport({
      api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asistente`,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: { negocio_id: negocio?.id },
    }),
    onError: (e) => toast.error("No pude responder. Intenta de nuevo."),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.messages, chat.status]);

  if (!loading && !negocio) return <Navigate to="/preparar-negocio" replace />;

  const enviar = async (texto: string) => {
    if (!texto.trim() || !negocio || !token) return;
    setInput("");
    await chat.sendMessage({ text: texto.trim() });
  };

  const cargando = chat.status === "submitted" || chat.status === "streaming";

  return (
    <div className="flex h-[calc(100vh-5.5rem)] flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="rounded-full bg-primary/15 p-2">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-extrabold leading-tight">Asistente</h1>
          <p className="text-xs text-muted-foreground">Te ayudo con tus ventas y gastos</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {chat.messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          const toolParts = m.parts.filter((p) => p.type.startsWith("tool-"));
          if (!text && toolParts.length === 0) return null;
          const esUsuario = m.role === "user";
          return (
            <div key={m.id} className={`flex ${esUsuario ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-base leading-relaxed ${
                  esUsuario
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {text && (
                  <div className="prose prose-sm max-w-none [&>p]:m-0 [&>p+p]:mt-2">
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </div>
                )}
                {toolParts.map((tp, i) => {
                  const part = tp as { type: string; output?: { ok?: boolean; monto?: number } };
                  const name = part.type.replace("tool-", "");
                  const ok = part.output?.ok;
                  if (name === "registrar_ingreso" && ok) {
                    return <p key={i} className="text-xs mt-1 opacity-80">✅ Venta guardada (${part.output?.monto})</p>;
                  }
                  if (name === "registrar_gasto" && ok) {
                    return <p key={i} className="text-xs mt-1 opacity-80">✅ Gasto guardado (${part.output?.monto})</p>;
                  }
                  return null;
                })}
              </div>
            </div>
          );
        })}
        {cargando && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
      </div>

      {chat.messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGERENCIAS.map((s) => (
            <button
              key={s}
              onClick={() => enviar(s)}
              disabled={cargando}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); enviar(input); }}
        className="border-t border-border bg-card p-3 flex gap-2 items-end"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(input);
            }
          }}
          placeholder="Escribe aquí... ej: vendí 200"
          rows={1}
          disabled={cargando}
          className="flex-1 resize-none rounded-2xl border border-input bg-background p-3 text-base outline-none focus:ring-2 ring-ring max-h-32"
        />
        <button
          type="submit"
          disabled={cargando || !input.trim()}
          className="rounded-full bg-primary p-3 text-primary-foreground shadow-md disabled:opacity-50 active:scale-95"
          aria-label="Enviar"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
