import { z } from "zod";

export const TransaccionSchema = z.object({
  tipo: z.enum(["INGRESO", "GASTO"], { errorMap: () => ({ message: "Tipo inválido" }) }),
  monto: z
    .number({ invalid_type_error: "Escribe cuánto fue" })
    .finite("Cantidad inválida")
    .positive("La cantidad debe ser mayor que cero")
    .max(10_000_000, "La cantidad es demasiado grande"),
  descripcion: z
    .string()
    .trim()
    .max(200, "La descripción es muy larga")
    .optional()
    .nullable(),
  con_factura: z.boolean().optional(),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .optional(),
});

export type TransaccionInput = z.infer<typeof TransaccionSchema>;
