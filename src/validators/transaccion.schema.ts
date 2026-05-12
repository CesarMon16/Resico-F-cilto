import { z } from "zod";

export const TransaccionSchema = z.object({
  tipo: z.enum(["ingreso", "gasto", "INGRESO", "GASTO"] as any),
  monto: z.number().positive().min(0.01, "El monto mínimo es $0.01"),
  concepto: z.string().min(3, "Mínimo 3 caracteres").max(100, "Máximo 100 caracteres").optional().nullable(),
  // Campos adicionales para compatibilidad con el servicio
  descripcion: z.string().max(200).optional().nullable(),
  con_factura: z.boolean().optional().nullable(),
  fecha: z.string().optional().nullable(),
});

export type TransaccionInput = z.infer<typeof TransaccionSchema>;
export type TransaccionForm = TransaccionInput;
