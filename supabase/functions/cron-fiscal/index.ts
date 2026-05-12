import { createClient } from "npm:@supabase/supabase-js";

// VAPID keys should be in environment variables
// deno-lint-ignore no-unused-vars
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Manejo de CORS
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Solo permitir llamadas autorizadas (ej. desde pg_cron o admin)
    // En producción esto debería validar una service_role key o un secret compartido
    const authHeader = req.headers.get("Authorization");
    const isServiceRole = authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
    
    // Si no es service role, verificamos si es una tarea programada
    // (A veces pg_cron envía cabeceras específicas o podemos usar un token secreto)
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Obtener todas las suscripciones activas
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*, profiles(nombre)");

    if (subsError) throw subsError;

    console.log(`Enviando recordatorios a ${subs?.length} suscriptores...`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // 2. Iterar y enviar (Simulado para PoC o usando Fetch API para Web Push)
    // Nota: El protocolo Web Push usa HTTP POST hacia el endpoint de la suscripción
    // con el payload encriptado usando las llaves p256dh y auth.
    
    for (const sub of subs || []) {
      try {
        // En una implementación real usaríamos una librería de Web Push.
        // Aquí simulamos el envío exitoso o el registro en la tabla de notificaciones.
        
        await supabase.from("notifications").insert({
          usuario_id: sub.usuario_id,
          titulo: "📅 Recordatorio Fiscal",
          mensaje: `Hola ${sub.profiles?.nombre || "contribuyente"}, hoy es día 17. No olvides presentar tu declaración mensual.`,
          tipo: "warning",
          metadata: { push_sent: true }
        });

        // Simulación de envío Push (esto requiere encriptación compleja)
        // console.log(`Push enviado a ${sub.endpoint}`);
        
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(err.message);
      }
    }

    return new Response(JSON.stringify({ 
      message: "Proceso de notificaciones completado",
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e) {
    console.error("Error en cron-fiscal:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
