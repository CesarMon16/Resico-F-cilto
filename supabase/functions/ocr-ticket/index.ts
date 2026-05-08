import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // 1. Manejo de peticiones OPTIONS (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64 } = await req.json()
    const API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY')

    if (!API_KEY) {
      throw new Error("API KEY no configurada en Supabase")
    }

    // 2. Llamada a Google Cloud Vision
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [{ type: 'TEXT_DETECTION' }]
          }]
        })
      }
    )

    const result = await response.json()
    if (result.error) throw new Error(result.error.message)

    const fullText = result.responses[0]?.fullTextAnnotation?.text || ""
    if (!fullText) {
      return new Response(JSON.stringify({ total: 0, text: "" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // --- LÓGICA DE EXTRACCIÓN DE SUBTOTAL ---
    const lines = fullText.split('\n');
    let subtotalDetectado = 0;

    // Diccionario de búsqueda para tickets en México
    const palabrasClave = [/subtotal/i, /sub-total/i, /sub total/i, /importe/i, /suma/i, /base/i];
    const moneyRegex = /(\d+\.\d{2})/;

    for (let i = 0; i < lines.length; i++) {
      const linea = lines[i].toLowerCase();
      
      if (palabrasClave.some(regex => regex.test(linea))) {
        // Intentamos buscar el monto en la misma línea
        let match = linea.match(moneyRegex);
        
        // Si no está en la misma línea, checamos la de abajo (común en tickets de súper)
        if (!match && lines[i + 1]) {
          match = lines[i + 1].match(moneyRegex);
        }

        if (match) {
          subtotalDetectado = parseFloat(match[1]);
          break; 
        }
      }
    }

    // RESPALDO: Si no encontramos la palabra "subtotal"
    // Buscamos el segundo monto más alto (el más alto suele ser el TOTAL con IVA)
    if (subtotalDetectado === 0) {
      const cleanText = fullText.replace(/,/g, '');
      const allAmounts = cleanText.match(/(\d+\.\d{2})/g)?.map(Number) || [];
      
      if (allAmounts.length >= 2) {
        // Eliminamos duplicados y ordenamos de mayor a menor
        const uniqueSorted = [...new Set(allAmounts)].sort((a, b) => b - a);
        subtotalDetectado = uniqueSorted[1]; // Tomamos el segundo lugar
      } else if (allAmounts.length === 1) {
        subtotalDetectado = allAmounts[0];
      }
    }

    return new Response(
      JSON.stringify({ 
        total: subtotalDetectado, 
        text: fullText 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})