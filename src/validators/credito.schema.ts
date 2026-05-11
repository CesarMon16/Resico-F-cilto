import { z } from "zod";

export const CreditoSchema = z.object({
  monto: z
    .number({ invalid_type_error: "Selecciona un monto" })
    .positive("Selecciona un monto válido")
    .max(1_000_000, "El monto máximo es de 1,000,000"),
});
export type CreditoInput = z.infer<typeof CreditoSchema>;
