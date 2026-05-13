import { createWorker } from "tesseract.js";

/**
 * OCR Engine v2 — Preprocesamiento + Regex corregido
 */
export interface OCRResult {
  monto_total: number;
  concepto: string;
  confianza: number;
}

/* ─── 1. PREPROCESAMIENTO DE IMAGEN CON CANVAS ─────────────────────
 *  Convierte la imagen a escala de grises y aplica umbral adaptativo
 *  (binarización) para mejorar radicalmente la legibilidad en tickets
 *  térmicos de baja calidad, fotos con poca luz o imágenes inclinadas.
 * ─────────────────────────────────────────────────────────────────── */
async function preprocesarImagen(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // Escalar: si la imagen es muy grande, reducimos para acelerar OCR
      const MAX_DIM = 2000;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      // Dibujar imagen original
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      // Obtener píxeles
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // ── Paso 1: Escala de grises ──
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = gray;
      }

      // ── Paso 2: Aumento de contraste ──
      const factor = 1.8; // Factor de contraste (1.0 = sin cambio)
      for (let i = 0; i < data.length; i += 4) {
        data[i]     = Math.min(255, Math.max(0, factor * (data[i]     - 128) + 128));
        data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
      }

      // ── Paso 3: Binarización (umbral adaptativo simple) ──
      // Calcula el promedio de luminosidad y usa como umbral dinámico
      let totalLum = 0;
      for (let i = 0; i < data.length; i += 4) totalLum += data[i];
      const umbral = (totalLum / (data.length / 4)) * 0.95;

      for (let i = 0; i < data.length; i += 4) {
        const v = data[i] > umbral ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = v;
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Canvas vacío")),
        "image/png"
      );
    };

    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = url;
  });
}

/* ─── 2. PARSEO DE MONTO ────────────────────────────────────────────
 *  Acepta todos los formatos comunes en tickets mexicanos:
 *  $123 / 123.50 / 1,234.56 / 1.234,56
 * ─────────────────────────────────────────────────────────────────── */
function parsearMonto(str: string): number {
  // Eliminar símbolo de pesos y espacios
  let s = str.replace(/\$/g, "").trim();

  // Detectar formato europeo (ej: 1.234,56) → convertir a 1234.56
  if (/\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // Formato americano/mexicano: quitar comas de miles
    s = s.replace(/,/g, "");
  }

  return parseFloat(s);
}

/* ─── 3. GOOGLE VISION API ──────────────────────────────────────────
 *  Motor primario. Usa DOCUMENT_TEXT_DETECTION, especializado en
 *  documentos impresos y tickets de caja. Mucho más preciso que Tesseract.
 * ─────────────────────────────────────────────────────────────────── */
const VISION_KEY = import.meta.env.VITE_GOOGLE_VISION_KEY as string | undefined;
const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

async function ocrConVisionAPI(file: File): Promise<string> {
  if (!VISION_KEY) throw new Error("No hay API key de Google Vision");

  // Convertir archivo a base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const response = await fetch(`${VISION_URL}?key=${VISION_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{
        image: { content: base64 },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
      }],
    }),
  });

  if (!response.ok) throw new Error(`Vision API error ${response.status}`);

  const json = await response.json();
  const texto = json.responses?.[0]?.fullTextAnnotation?.text as string | undefined;
  if (!texto) throw new Error("Vision API no devolvió texto");

  return texto;
}

/* ─── 4. MOTOR PRINCIPAL ────────────────────────────────────────────  */
export async function procesarImagenTicket(
  file: File,
  onStatus?: (status: string) => void
): Promise<OCRResult> {

  // ── Obtener texto: Vision API → Tesseract (fallback) ────────────
  let rawText = "";
  let confidence = 0.9; // Vision API no retorna score, asumimos alta confianza

  if (VISION_KEY) {
    try {
      onStatus?.("Analizando con Google Vision...");
      rawText = await ocrConVisionAPI(file);
    } catch (visionErr) {
      console.warn("Vision API falló, usando Tesseract:", visionErr);
    }
  }

  if (!rawText) {
    // Fallback: preprocesar imagen y usar Tesseract
    onStatus?.("Mejorando calidad de imagen...");
    let imagenAOcr: File | Blob = file;
    try { imagenAOcr = await preprocesarImagen(file); } catch { /* sin preprocesamiento */ }

    onStatus?.("Leyendo ticket con OCR local...");
    const worker = await createWorker("spa");
    try {
      const { data } = await worker.recognize(imagenAOcr);
      rawText    = data.text;
      confidence = data.confidence / 100;
    } finally {
      await worker.terminate();
    }
  }

  onStatus?.("Extrayendo datos...");
  const lines = rawText.split("\n").map((l) => l.trim().toUpperCase()).filter(Boolean);

  // 🔍 DEBUG — ver qué leyó el motor (quitar en producción)
  console.group("🧾 OCR DEBUG");
  console.log("📄 Texto crudo:\n", rawText);
  console.log("📋 Líneas procesadas:", lines);
  console.groupEnd();

    // ── EXTRACCIÓN DE MONTO TOTAL ────────────────────────────────
    // Palabras que indican el TOTAL real del ticket
    const PALABRAS_TOTAL  = ["TOTAL", "GRAN TOTAL", "NETO A PAGAR", "IMPORTE TOTAL", "A PAGAR", "SUMA TOTAL"];
    // Palabras que indican el PAGO del cliente o el cambio (NO son el total)
    const PALABRAS_PAGO   = ["CAMBIO", "EFECTIVO", "TARJETA", "PAGO CON", "FORMA DE PAGO", "RECIBIDO", "SU CAMBIO", "ENTREGADO", "VUELTO"];
    // Líneas que son claramente metadatos y no precios
    const PALABRAS_METADA = ["FOLIO", "TICKET", "BOLETA", "FAC", "RFC", "TEL", "NUM.", "ARTICULO", "CANT.", "CANTIDAD", "SERIE"];

    // Regex: captura precios con o sin centavos, con o sin $
    const amountRegex = /\$?\s*(\d{1,3}(?:[,.\s]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/g;

    let bestAmount = 0;
    let highestScore = -Infinity;

    lines.forEach((line, index) => {
      // Saltar líneas de metadatos
      if (PALABRAS_METADA.some((p) => line.includes(p))) return;

      const prevLine = index > 0 ? lines[index - 1] : "";
      
      // Penalización inmediata muy alta para líneas de pago/cambio/ahorro
      const esPago = PALABRAS_PAGO.some((p) => line.includes(p) || prevLine.includes(p));
      const esAhorroOImpuesto = line.includes("AHORRO") || line.includes("IMPUESTO") || line.includes("IEPS");

      const matches = [...line.matchAll(amountRegex)];

      for (const match of matches) {
        const raw = match[1];
        const value = parsearMonto(raw);

        if (isNaN(value) || value <= 0 || value > 500_000) continue;

        let score = 0;

        // ── Bonificaciones (evaluamos línea actual y la anterior) ──
        const contexto = line + " " + prevLine;
        if (contexto.includes("TOTAL"))       score += 150;
        if (contexto.includes("GRAN TOTAL"))  score += 180;
        if (contexto.includes("A PAGAR"))     score += 120;
        if (contexto.includes("NETO"))        score +=  80;
        if (contexto.includes("IMPORTE"))     score +=  60;
        
        if (line.includes("$"))               score +=  30;

        // Posición: los totales están típicamente en la parte inferior
        if (index > lines.length * 0.5)  score +=  25;
        if (index > lines.length * 0.75) score +=  25;

        // Desempate por magnitud (pero con techo para no priorizar folios grandes)
        score += Math.min(value / 500, 15);

        // ── Penalizaciones ──
        if (esPago)                                          score -= 200; 
        if (esAhorroOImpuesto)                               score -= 200; 
        if (line.match(/\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/))   score -= 300; 
        if (line.includes("DESCUENTO"))                      score -=  60; 
        if (value < 1)                                       score -= 100; 

        if (score > highestScore) {
          highestScore = score;
          bestAmount   = value;
        }
      }
    });

    // ── FALLBACK 1: Líneas adyacentes al TOTAL ───────────────────
    // Cuando Tesseract no pudo leer el número junto a "TOTAL",
    // buscamos en las líneas inmediatamente cercanas.
    if (bestAmount === 0 || highestScore < 100) {
      const totalIdx = lines.findIndex((l) => l.includes("TOTAL") && !l.includes("SUBTOTAL"));
      if (totalIdx >= 0) {
        const cerca = [lines[totalIdx - 1], lines[totalIdx], lines[totalIdx + 1], lines[totalIdx + 2]].filter(Boolean);
        outer: for (const adj of cerca) {
          if (["CAMBIO", "EFECTIVO", "PAGO CON", "TARJETA"].some((p) => adj.includes(p))) continue;
          for (const m of [...adj.matchAll(/\$?\s*(\d+(?:[.,]\d{1,2})?)/g)]) {
            const v = parsearMonto(m[1]);
            if (!isNaN(v) && v > 0 && v < 100_000) { bestAmount = v; break outer; }
          }
        }
      }
    }

    // ── FALLBACK 2: Matemática PAGO − CAMBIO ─────────────────────
    // Si aún no encontramos total: Total = Pago entregado − Cambio devuelto
    if (bestAmount === 0 || highestScore < 0) {
      let pagoCon = 0;
      let cambio  = 0;
      for (const line of lines) {
        const nums = [...line.matchAll(/\$?\s*(\d+(?:[.,]\d{1,2})?)/g)]
          .map((m) => parsearMonto(m[1])).filter((v) => !isNaN(v) && v > 0);
        if ((line.includes("PAGO CON") || line.includes("RECIBIDO") || line.includes("ENTREGADO")) && nums.length)
          pagoCon = Math.max(...nums);
        if ((line.includes("CAMBIO") || line.includes("VUELTO") || line.includes("SU CAMBIO")) && nums.length)
          cambio = nums[nums.length - 1];
      }
      if (pagoCon > 0 && cambio >= 0 && pagoCon > cambio)
        bestAmount = Math.round((pagoCon - cambio) * 100) / 100;
    }

    // ── EXTRACCIÓN DE CONCEPTO ───────────────────────────────────
    // Estrategia: puntuar TODAS las líneas del header con un score compuesto.
    // Penalizar fuertemente direcciones y palabras operativas.
    // Preferir líneas que parezcan nombres de negocios o marcas.
    const RUIDO_CONCEPTO = /TOTAL|PAGO|CAMBIO|EFECTIVO|IVA|RFC|FECHA|HORA|TEL|DIR|FOLIO|TICKET|SUBTOTAL|DESCUENTO|IMPORTE|CLIENTE|DOMICILIO|GRACIAS|VUELVA|CAJERO|ATENDIO|SUCURSAL|SERIE|CAJA/;

    // Palabras que indican una dirección (penalizar mucho)
    const PATRON_DIRECCION = /\b(AV|AVE|AVENIDA|CALLE|CJON|CALLEJON|BLVD|BOULEVARD|COL|COLONIA|SUR|NORTE|OTE|PTE|ORIENTE|PONIENTE|NO\.|NUM|S\/N|SN|CP|INTERIOR|INT)\b/;

    // Indicadores de nombre comercial (bonificar)
    const PATRON_NEGOCIO = /\b(TIENDA|TAQUERIA|RESTAURANTE|SUPER|MERCADO|FARMACIA|FERRETERIA|PAPELERIA|CARNICERIA|TORTILLERIA|COMERCIAL|EXPRESS|ABARROTES|MISCELANEA|POLLERIA|PANADERIA|ZAPATERIA|ROPA|CLINICA|LABORATORIO|SALON|SPA|MECANICA|AUTOMOTRIZ)\b/;

    let conceptoDetectado = "No se pudo encontrar el concepto";

    // Buscamos en el primer 50% del ticket
    const headerLines = lines.slice(0, Math.max(6, Math.ceil(lines.length * 0.5)));

    let mejorLinea = "";
    let mejorScore = -Infinity;

    for (const line of headerLines) {
      const cleanLine = line.replace(/[^A-ZÁÉÍÓÚÑ ]/g, "").trim();

      if (cleanLine.length < 4 || cleanLine.length > 55) continue;
      if (/^\d+$/.test(cleanLine)) continue;
      if (RUIDO_CONCEPTO.test(cleanLine)) continue;

      // Proporción de letras (más letras = más probable que sea texto real)
      const letras = (cleanLine.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length;
      const densidad = letras / cleanLine.length;

      let scoreLine = densidad * cleanLine.length;

      // Penalización fuerte si parece dirección
      if (PATRON_DIRECCION.test(cleanLine)) scoreLine -= 50;

      // Bonus si parece nombre de negocio
      if (PATRON_NEGOCIO.test(cleanLine)) scoreLine += 30;

      // Bonus si tiene entre 5 y 30 caracteres (nombre típico de negocio)
      if (cleanLine.length >= 5 && cleanLine.length <= 30) scoreLine += 10;

      if (scoreLine > mejorScore) {
        mejorScore = scoreLine;
        mejorLinea = cleanLine;
      }
    }

    if (mejorLinea && mejorScore > 0) {
      conceptoDetectado = mejorLinea.charAt(0) + mejorLinea.slice(1).toLowerCase();
    }

    return {
      monto_total: bestAmount,
      concepto:    conceptoDetectado,
      confianza:   confidence,
    };
}

/** @deprecated */
export async function extraerDatosTicket(file: File) {
  return procesarImagenTicket(file);
}
