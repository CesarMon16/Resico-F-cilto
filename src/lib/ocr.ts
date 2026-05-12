/**
 * ocr.ts — Motor de extracción de datos de tickets via Google Cloud Vision API
 * Extrae: monto, descripción, fecha, comercio, si tiene factura, nivel de confianza
 */

export interface DatosTicket {
  monto: number | null;
  descripcion: string;
  fecha: string | null;
  conFactura: boolean;
  confianza: "alta" | "media" | "baja";
  textoRaw: string;
  comercio: string | null;
  categoria: string;
}

// ─── Helpers de parseo ────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // quita el prefijo data:image/...;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function extractMonto(text: string): { monto: number | null; confianza: "alta" | "media" | "baja" } {
  // Limpieza inicial: convertir caracteres comunes de ruido OCR en montos
  const cleanText = text
    .replace(/(\d)O/g, "$10") // O -> 0 después de un número
    .replace(/O(\d)/g, "0$1") // O -> 0 antes de un número
    .replace(/(\d)S/g, "$15") // S -> 5 después de un número
    .replace(/S(\d)/g, "5$1"); // S -> 5 antes de un número

  // Patrones de alta confianza: líneas con TOTAL / IMPORTE / A PAGAR
  const highPatterns = [
    /(?:TOTAL|IMPORTE\s*TOTAL|IMPORTE|A\s*PAGAR|AMOUNT\s*DUE?|NETO)\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/gi,
    /(?:SUBTOTAL)\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/gi,
  ];

  for (const pat of highPatterns) {
    pat.lastIndex = 0;
    const m = pat.exec(cleanText);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ""));
      if (val > 0 && val < 1_000_000) return { monto: val, confianza: "alta" };
    }
  }

  // Confianza media: cualquier monto con $ o que parezca un total al final del ticket
  const medPat = /\$\s*([\d,]+\.?\d{0,2})/g;
  const amounts: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = medPat.exec(cleanText)) !== null) {
    const val = parseFloat(m[1].replace(/,/g, ""));
    if (val > 0 && val < 1_000_000) amounts.push(val);
  }
  
  if (amounts.length > 0) {
    // Si hay varios, el más grande suele ser el total
    return { monto: Math.max(...amounts), confianza: "media" };
  }

  // Confianza baja: buscar el último número decimal que parezca un monto razonable
  const lowPat = /\b(\d{1,5}[.,]\d{2})\b/g;
  const nums: number[] = [];
  while ((m = lowPat.exec(cleanText)) !== null) {
    const val = parseFloat(m[1].replace(",", "."));
    if (val > 1 && val < 100_000) nums.push(val);
  }
  if (nums.length > 0) return { monto: nums[nums.length - 1], confianza: "baja" };

  return { monto: null, confianza: "baja" };
}

function extractFecha(text: string): string | null {
  const patterns = [
    // DD/MM/YYYY  o  DD-MM-YYYY
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/,
    // YYYY/MM/DD
    /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/,
    // DD MMM YYYY  (12 May 2026)
    /\b(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+(\d{4})\b/i,
  ];

  const meses: Record<string, string> = {
    ene:"01",jan:"01",feb:"02",mar:"03",abr:"04",apr:"04",may:"05",
    jun:"06",jul:"07",ago:"08",aug:"08",sep:"09",oct:"10",nov:"11",dic:"12",dec:"12",
  };

  for (const pat of patterns) {
    const match = text.match(pat);
    if (!match) continue;
    try {
      let year: string, month: string, day: string;
      if (match[1].length === 4) {
        [, year, month, day] = match;
      } else if (/[a-z]/i.test(match[2])) {
        day = match[1].padStart(2, "0");
        month = meses[match[2].toLowerCase().slice(0, 3)] ?? "01";
        year = match[3];
      } else {
        day = match[1].padStart(2, "0");
        month = match[2].padStart(2, "0");
        year = match[3];
      }
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) return `${year}-${month}-${day}`;
    } catch { /* silencioso */ }
  }
  return null;
}

function detectarCategoria(text: string): string {
  const t = text.toLowerCase();
  const cats: { keys: string[]; nombre: string }[] = [
    { keys: ["oxxo","7-eleven","seven","extra","bodega aurrera","chedraui","walmart","soriana","comercial mexicana","abarrotes","tienda"], nombre: "Abarrotes / Tienda" },
    { keys: ["gasolina","pemex","bp","shell","combustible","litro","magna","premium","diesel"], nombre: "Gasolina / Combustible" },
    { keys: ["farmacia","medicina","medicamento","benavides","similares","guadalajara"], nombre: "Farmacia / Medicamentos" },
    { keys: ["papelería","papel","oficina","útiles","impresión","tóner","toner","pluma","lápiz","folder","cartuchos"], nombre: "Papelería / Oficina" },
    { keys: ["restaurante","taquería","fonda","torta","pizza","sushi","hamburgues","comida","alimentos","orden","consumo","mesero","propina"], nombre: "Alimentos / Restaurante" },
    { keys: ["cfe","luz","electricidad","agua","simas","sacmex","gas","telmex","internet","telcel","at&t","movistar","axtel","megacable"], nombre: "Servicios públicos" },
    { keys: ["ferretería","construcción","material","tornillo","herramienta","cemento","varilla","pintura"], nombre: "Ferretería / Construcción" },
    { keys: ["taxi","uber","didi","cabify","transporte","autobús","metro","pasaje","boleto","viaje"], nombre: "Transporte" },
    { keys: ["ropa","calzado","zapatos","vestimenta","playera","pantalón","tenis","sneakers"], nombre: "Ropa / Calzado" },
    { keys: ["hotel","hospedaje","motel","airbnb","posada"], nombre: "Hospedaje" },
  ];
  for (const c of cats) {
    if (c.keys.some((k) => t.includes(k))) return c.nombre;
  }
  return "Gasto general";
}

function extractComercio(lines: string[]): string | null {
  // El comercio suele estar en las primeras 5 líneas
  const ignores = ["total", "subtotal", "fecha", "folio", "ticket", "vta", "caja", "atendido", "cliente", "bienvenidos", "gracias"];
  
  for (const line of lines.slice(0, 5)) {
    const clean = line.trim().replace(/[^\w\sáéíóúÁÉÍÓÚüÜñÑ.,&\-]/g, "");
    if (clean.length >= 3 && clean.length <= 50) {
      if (ignores.some(ig => clean.toLowerCase().includes(ig))) continue;
      if (/^\d+$/.test(clean)) continue; // Solo números no es un comercio
      return clean;
    }
  }
  return null;
}

function detectarFactura(text: string): boolean {
  const t = text.toLowerCase();
  return ["factura", "cfdi", "rfc:", "folio fiscal", "receptor", "emisor", "sat.gob.mx", "timbre fiscal"].some(
    (k) => t.includes(k)
  );
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function extraerDatosTicket(file: File): Promise<DatosTicket> {
  const key = import.meta.env.VITE_GOOGLE_VISION_KEY as string | undefined;
  if (!key) throw new Error("VITE_GOOGLE_VISION_KEY no configurada en .env");

  const base64 = await fileToBase64(file);

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json() as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Error Vision API (${response.status})`);
  }

  const result = await response.json() as {
    responses: { fullTextAnnotation?: { text: string } }[];
  };
  const textoRaw = result.responses?.[0]?.fullTextAnnotation?.text ?? "";

  if (!textoRaw.trim()) {
    return {
      monto: null,
      descripcion: "No se detectó texto en la imagen",
      fecha: null,
      conFactura: false,
      confianza: "baja",
      textoRaw: "",
      comercio: null,
      categoria: "Gasto general",
    };
  }

  const lines = textoRaw.split("\n").filter((l) => l.trim());
  const { monto, confianza } = extractMonto(textoRaw);
  const fecha = extractFecha(textoRaw);
  const categoria = detectarCategoria(textoRaw);
  const comercio = extractComercio(lines);
  const conFactura = detectarFactura(textoRaw);
  const descripcion = comercio ? `${categoria} — ${comercio}` : categoria;

  return { monto, descripcion, fecha, conFactura, confianza, textoRaw, comercio, categoria };
}
