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

export interface OCRResult {
  monto_detectado: number;
  fecha_emision: string; // ISO 8601
  rfc_emisor: string | null;
  confidence_score: number;
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
  // Patrones de alta confianza: líneas con TOTAL / IMPORTE / A PAGAR
  const highPatterns = [
    /(?:TOTAL|IMPORTE\s*TOTAL|IMPORTE|A\s*PAGAR|AMOUNT\s*DUE?)\s*[:-]?\s*\$?\s*([\d,]+\.?\d{0,2})/gi,
    /(?:SUBTOTAL)\s*[:-]?\s*\$?\s*([\d,]+\.?\d{0,2})/gi,
  ];

  for (const pat of highPatterns) {
    pat.lastIndex = 0;
    const m = pat.exec(text);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ""));
      if (val > 0 && val < 1_000_000) return { monto: val, confianza: "alta" };
    }
  }

  // Confianza media: cualquier monto con $
  const medPat = /\$\s*([\d,]+\.?\d{0,2})/g;
  const amounts: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = medPat.exec(text)) !== null) {
    const val = parseFloat(m[1].replace(/,/g, ""));
    if (val > 0 && val < 1_000_000) amounts.push(val);
  }
  if (amounts.length > 0) return { monto: Math.max(...amounts), confianza: "media" };

  // Confianza baja: números decimales flotantes
  const lowPat = /\b(\d{1,5}[.,]\d{2})\b/g;
  const nums: number[] = [];
  while ((m = lowPat.exec(text)) !== null) {
    const val = parseFloat(m[1].replace(",", "."));
    if (val > 1 && val < 100_000) nums.push(val);
  }
  if (nums.length > 0) return { monto: Math.max(...nums), confianza: "baja" };

  return { monto: null, confianza: "baja" };
}

function extractFecha(text: string): string | null {
  const patterns = [
    // DD/MM/YYYY  o  DD-MM-YYYY
    /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/,
    // YYYY/MM/DD
    /\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/,
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
  for (const line of lines.slice(0, 6)) {
    const clean = line.trim().replace(/[^\w\sáéíóúÁÉÍÓÚüÜñÑ.,&-]/g, "");
    if (clean.length >= 4 && clean.length <= 60 && !/^\d+$/.test(clean) && !/^[-=*]+$/.test(clean)) {
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

/**
 * Función de emulación de OCR para Fase 2
 */
export async function procesarImagenTicket(file: File): Promise<OCRResult> {
  // Latencia determinista de 1500ms
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Lógica determinista basada en el tamaño del archivo
  const monto_detectado = (file.size % 10000) / 100;
  const fecha_emision = new Date().toISOString();
  const confidence_score = 0.92;
  const rfc_emisor = file.size % 2 === 0 ? "XAXX010101000" : null;

  return {
    monto_detectado,
    fecha_emision,
    rfc_emisor,
    confidence_score,
  };
}
