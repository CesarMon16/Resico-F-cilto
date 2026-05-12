import { z } from "zod";

export const PerfilSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "Nombre muy largo"),
  correo: z.string().email("Ingresa un correo electrónico válido"),
  despacho: z.string().max(100, "Nombre del despacho muy largo").optional().nullable(),
});

export type PerfilInput = z.infer<typeof PerfilSchema>;
