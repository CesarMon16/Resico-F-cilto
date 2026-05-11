import { z } from "zod";

export const NegocioSchema = z.object({
  nombre_negocio: z.string().trim().min(2, "Escribe el nombre de tu negocio").max(120, "Nombre muy largo"),
  giro: z.string().trim().max(120).optional().nullable(),
  ubicacion: z.string().trim().max(200).optional().nullable(),
});
export type NegocioInput = z.infer<typeof NegocioSchema>;
