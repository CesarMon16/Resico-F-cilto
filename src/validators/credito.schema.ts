import { z } from "zod";

/**
 * Esquema de validación estricta para Créditos.
 * Blindaje: Coacción de números, validación de positividad y soporte para opcionales reales.
 */
export const CreditoSchema = z.object({
  institucion: z
    .string()
    .trim()
    .min(2, "Nombre de la institución demasiado corto")
    .max(100, "Nombre demasiado largo"),
  monto: z.coerce
    .number({ 
      invalid_type_error: "El monto debe ser un número válido",
      required_error: "El monto es obligatorio" 
    })
    .positive("El monto debe ser mayor a cero")
    .refine((val) => !isNaN(val), { message: "Monto inválido (NaN)" }),
  pago_mensual: z.coerce
    .number({ 
      invalid_type_error: "El pago debe ser un número válido",
      required_error: "El pago mensual es obligatorio" 
    })
    .positive("El pago debe ser mayor a cero")
    .refine((val) => !isNaN(val), { message: "Pago inválido (NaN)" }),
  dia_pago: z.coerce
    .number({ invalid_type_error: "Día no válido" })
    .min(1, "Día mínimo 1")
    .max(31, "Día máximo 31"),
});

export type CreditoInput = z.infer<typeof CreditoSchema>;
export type CreditoForm = CreditoInput;
