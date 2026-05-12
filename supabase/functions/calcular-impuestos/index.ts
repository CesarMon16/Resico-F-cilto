import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calcularResumenFiscal } from "../_shared/fiscal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { negocio_id, mes, anio } = await req.json();

    if (!negocio_id || !mes || !anio) {
      return new Response(JSON.stringify({ error: "Faltan parámetros: negocio_id, mes, anio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const fin = `${anio}-${String(mes).padStart(2, "0")}-31`;

    const { data: transacciones, error } = await supabaseClient
      .from("transacciones")
      .select("tipo, monto, con_factura")
      .eq("negocio_id", negocio_id)
      .gte("fecha", inicio)
      .lte("fecha", fin);

    if (error) throw error;

    const resumen = calcularResumenFiscal(transacciones ?? []);

    return new Response(JSON.stringify(resumen), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
