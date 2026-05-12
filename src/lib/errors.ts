import { toast } from "sonner";

/**
 * Manejo central de errores. Muestra un toast amigable en español
 * y registra detalle técnico en consola para debugging.
 */
export function handleError(error: unknown, fallback = "Algo salió mal. Intenta de nuevo."): void {
  // eslint-disable-next-line no-console
  console.error("[app-error]", error);
  const msg = extractMessage(error) ?? fallback;
  toast.error(msg);
}

export function extractMessage(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    const m = (error as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return null;
}

/** Lanza un Error con mensaje humano si la validación zod falla */
export function throwValidation(result: { success: boolean; error?: { issues?: { message?: string }[] }; data?: unknown }) {
  if (!result.success) {
    const issue = result.error?.issues?.[0];
    throw new Error(issue?.message ?? "Revisa los datos del formulario");
  }
  return result.data;
}
