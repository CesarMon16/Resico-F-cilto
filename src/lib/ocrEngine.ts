/**
 * ocr.ts — Motor de extracción de datos de tickets via Google Cloud Vision API
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

/**
 * Función de emulación de OCR para Fase 2 del Protocolo de Refinamiento de UX/IA
 */
export async function procesarImagenTicket(file: File): Promise<OCRResult> {
  // Latencia determinista de 1500ms requerida por el protocolo
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

// Mantenemos extraerDatosTicket temporalmente como alias para evitar errores de caché persistente
// pero marcamos su obsolescencia.
/** @deprecated Usar procesarImagenTicket */
export async function extraerDatosTicket(file: File): Promise<DatosTicket> {
  const result = await procesarImagenTicket(file);
  return {
    monto: result.monto_detectado,
    descripcion: `Gasto detectado (RFC: ${result.rfc_emisor || "N/A"})`,
    fecha: result.fecha_emision,
    conFactura: !!result.rfc_emisor,
    confianza: result.confidence_score > 0.9 ? "alta" : "media",
    textoRaw: "Simulado",
    comercio: result.rfc_emisor,
    categoria: "Gasto general",
  };
}
