import { extraerDatosTicket, type DatosTicket } from "@/lib/ocrEngine";
import { BaseService } from "./base.service";
import { wrapError } from "@/lib/error-handler";
import { supabase } from "@/integrations/supabase/client";

/**
 * Servicio para la gestión de OCR y procesamiento de documentos.
 */
export class OcrService extends BaseService {
  /**
   * Procesa un archivo de imagen, extrae datos y sugiere una transacción.
   */
  async procesarTicket(file: File): Promise<DatosTicket> {
    try {
      const datos = await extraerDatosTicket(file);
      
      // Registro de auditoría del intento de OCR
      void this.exec(
        async () => ({ data: null, error: null }),
        "OCR_PROCESADO",
        { 
          confianza: datos.confianza, 
          comercio: datos.comercio,
          monto_detectado: datos.monto 
        }
      );

      return datos;
    } catch (err) {
      throw wrapError(err);
    }
  }

  /**
   * Guarda el ticket físicamente en el storage y crea el vínculo en la base de datos.
   */
  async vincularTicket(file: File, transaccion_id: string, metadata: DatosTicket) {
    return this.exec(async () => {
      const ext = file.name.split(".").pop() || "jpg";
      const fecha = new Date().toISOString().split("T")[0];
      const path = `${this.usuario_id}/${fecha.substring(0, 7)}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("tickets")
        .upload(path, file);

      if (uploadError) return { data: null, error: uploadError };

      const { data: urlData } = supabase.storage.from("tickets").getPublicUrl(path);

      const { error: dbError } = await supabase.from("documentos").insert({
        usuario_id: this.usuario_id,
        negocio_id: this.negocio_id,
        tipo: "ticket",
        categoria: "gastos",
        url: urlData.publicUrl,
        transaccion_id,
        metadata_ocr: metadata
      });

      return { data: urlData.publicUrl, error: dbError };
    }, "TICKET_VINCULADO", { transaccion_id });
  }
}
