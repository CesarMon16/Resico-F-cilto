import { z } from "zod";

/**
 * Esquema de validación estricta para Negocios/Actividades.
 * Blindaje: trim obligatorio, soporte para opcionales reales y límites de longitud.
 */
export const NegocioSchema = z.object({
  nombre_negocio: z
    .string()
    .trim()
    .min(2, "Escribe el nombre de tu actividad (mínimo 2 letras)")
    .max(120, "El nombre de la actividad es demasiado largo"),
  giro: z
    .string()
    .trim()
    .max(120, "El giro es demasiado largo")
    .optional()
    .or(z.literal("")),
  ubicacion: z
    .string()
    .trim()
    .max(200, "La ubicación es demasiado larga")
    .optional()
    .or(z.literal("")),
  actividad_economica: z
    .string()
    .trim()
    .optional(),
});

export type NegocioInput = z.infer<typeof NegocioSchema>;
