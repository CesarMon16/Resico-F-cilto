import { z } from "zod";

/**
 * Esquema de validación estricta para Perfiles (Contribuyentes y Contadores).
 * Blindaje: 
 * - Teléfono: 10 dígitos exactos, sin letras (regex estricta).
 * - Email: sanitización y validación formal.
 * - RFC/CURP: Formatos específicos o vacíos.
 * - Sanitización: .trim() en todo string.
 */
export const PerfilSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "Nombre demasiado largo"),
  correo: z
    .string()
    .trim()
    .email("Ingresa un correo electrónico válido")
    .max(100, "Correo demasiado largo"),
  telefono: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "El teléfono debe tener 10 dígitos exactos y solo números")
    .optional()
    .or(z.literal("")),
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3}$/, "RFC no válido")
    .optional()
    .or(z.literal("")),
  curp: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d$/, "CURP no válida")
    .optional()
    .or(z.literal("")),
  domicilio_fiscal: z
    .string()
    .trim()
    .max(200, "Domicilio demasiado largo")
    .optional()
    .or(z.literal("")),
  fecha_inicio_operaciones: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  // Campos específicos de contador
  despacho: z
    .string()
    .trim()
    .max(100, "Nombre del despacho demasiado largo")
    .optional()
    .or(z.literal("")),
  ciudad: z
    .string()
    .trim()
    .max(100, "Nombre de ciudad demasiado largo")
    .optional()
    .or(z.literal("")),
  experiencia_anios: z.coerce
    .number({ invalid_type_error: "Debe ser un número" })
    .min(0, "Mínimo 0")
    .max(60, "Máximo 60")
    .optional()
    .nullable(),
});

export type PerfilInput = z.infer<typeof PerfilSchema>;
export type PerfilForm = PerfilInput;
