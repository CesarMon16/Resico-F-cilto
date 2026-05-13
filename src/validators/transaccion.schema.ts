import { z } from "zod";

/**
 * Esquema de validación estricta para Transacciones.
 * Implementa reglas de blindaje Staff Engineer: trim, coacción y tipos literales.
 */
export const TransaccionSchema = z.object({
  tipo: z.enum(["INGRESO", "GASTO", "ingreso", "gasto"], {
    invalid_type_error: "Tipo de transacción no válido",
  }),
  monto: z.coerce
    .number({ 
      invalid_type_error: "El monto debe ser un número válido",
      required_error: "El monto es obligatorio" 
    })
    .positive("El monto debe ser mayor a cero")
    .min(0.01, "El monto mínimo es $0.01")
    .refine((val) => !isNaN(val), { message: "Monto inválido (NaN)" }),
  concepto: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(100, "Máximo 100 caracteres")
    .optional()
    .or(z.literal("")),
  descripcion: z
    .string()
    .trim()
    .max(200, "Descripción demasiado larga")
    .optional()
    .or(z.literal("")),
  con_factura: z.boolean().optional().nullable(),
  fecha: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
});

export type TransaccionInput = z.infer<typeof TransaccionSchema>;
export type TransaccionForm = TransaccionInput;
