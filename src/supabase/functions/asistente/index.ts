import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "npm:ai";
import { z } from "npm:zod";
import { createClient } from "npm:@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un asistente fiscal amigable para micro-negocios en México (régimen RESICO).
Hablas como un amigo que ayuda con cosas de impuestos. NUNCA usas tecnicismos.
Tu trabajo es ayudar a registrar ventas y gastos haciendo preguntas simples, una a la vez.

REGLAS:
- Usa lenguaje muy sencillo, como WhatsApp. Emojis ocasionales.
- Si el usuario dice "vendí 500", regístralo con la herramienta registrar_ingreso.
- Si dice "compré algo de 200 pesos en la papelería", usa registrar_gasto.
- Si no sabes si tuvo factura, pregunta de forma simple: "¿Te dieron factura? (sí/no)"
- Después de registrar, confirma con un mensaje corto y amable.
- Si te preguntan cuánto deben pagar, usa consultar_resumen.
- NUNCA digas palabras como "ISR", "IVA acreditable", "base gravable" sin explicarlas en español simple.
- Mantén respuestas cortas (1-3 frases).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const { messages, negocio_id }: { messages: UIMessage[]; negocio_id: string } = await req.json();
    if (!negocio_id) return new Response("negocio_id requerido", { status: 400, headers: corsHeaders });

    const today = new Date().toISOString().slice(0, 10);

    const tools = {
      registrar_ingreso: tool({
        description: "Registra una venta/ingreso del negocio.",
        inputSchema: z.object({
          monto: z.number().positive().describe("Total cobrado en pesos (con IVA incluido)"),
          descripcion: z.string().optional().describe("Qué vendió, ej: 'tortillas'"),
          con_factura: z.boolean().default(false).describe("¿Le dio factura al cliente?"),
          metodo_pago: z.enum(["efectivo", "transferencia", "tarjeta", "otro"]).optional(),
        }),
        execute: async (input) => {
          const { error, data } = await supabase.from("transacciones").insert({
            usuario_id: user.id,
            negocio_id,
            tipo: "INGRESO",
            monto: input.monto,
            descripcion: input.descripcion ?? null,
            con_factura: input.con_factura,
            metodo_pago: input.metodo_pago ?? null,
            fecha: today,
            origen: "asistente",
          }).select("id").single();
          if (error) return { ok: false, error: error.message };
          return { ok: true, id: data.id, monto: input.monto };
        },
      }),
      registrar_gasto: tool({
        description: "Registra un gasto/compra del negocio.",
        inputSchema: z.object({
          monto: z.number().positive(),
          descripcion: z.string().optional(),
          con_factura: z.boolean().default(false),
          contraparte: z.string().optional().describe("Dónde compró"),
          metodo_pago: z.enum(["efectivo", "transferencia", "tarjeta", "otro"]).optional(),
        }),
        execute: async (input) => {
          const { error, data } = await supabase.from("transacciones").insert({
            usuario_id: user.id,
            negocio_id,
            tipo: "GASTO",
            monto: input.monto,
            descripcion: input.descripcion ?? null,
            con_factura: input.con_factura,
            contraparte: input.contraparte ?? null,
            metodo_pago: input.metodo_pago ?? null,
            fecha: today,
            origen: "asistente",
          }).select("id").single();
          if (error) return { ok: false, error: error.message };
          return { ok: true, id: data.id, monto: input.monto };
        },
      }),
      consultar_resumen: tool({
        description: "Consulta cuánto vendió, gastó e impuestos estimados del mes actual.",
        inputSchema: z.object({}),
        execute: async () => {
          const now = new Date();
          const inicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
          const { data } = await supabase
            .from("transacciones")
            .select("tipo, monto, con_factura")
            .eq("negocio_id", negocio_id)
            .gte("fecha", inicio);
          let ingresos = 0, gastos = 0, ivaCob = 0, ivaAcr = 0;
          for (const t of data ?? []) {
            const monto = Number(t.monto);
            const sub = monto / 1.16;
            const iva = monto - sub;
            if (t.tipo === "INGRESO") {
              ingresos += monto;
              if (t.con_factura) ivaCob += iva;
            } else {
              gastos += monto;
              if (t.con_factura) ivaAcr += iva;
            }
          }
          const subIng = ingresos / 1.16;
          const tasa = subIng <= 25000 ? 0.01 : subIng <= 50000 ? 0.011 : subIng <= 83333.33 ? 0.015 : subIng <= 208333.33 ? 0.02 : 0.025;
          const isr = subIng * tasa;
          const ivaPagar = Math.max(ivaCob - ivaAcr, 0);
          return {
            ingresos_mes: Math.round(ingresos * 100) / 100,
            gastos_mes: Math.round(gastos * 100) / 100,
            impuesto_estimado: Math.round((isr + ivaPagar) * 100) / 100,
          };
        },
      }),
    };

    const gateway = createLovableAiGatewayProvider(Deno.env.get("LOVABLE_API_KEY")!);
    const result = streamText({
      model: gateway("google/gemini-3-flash-preview"),
      system: SYSTEM_PROMPT,
      tools,
      stopWhen: stepCountIs(50),
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse({ headers: corsHeaders });
  } catch (e) {
    console.error("asistente error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
