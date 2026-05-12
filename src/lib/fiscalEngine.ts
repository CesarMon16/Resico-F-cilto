/**
 * Motor de validación de topes fiscales RESICO.
 * Funciones puras – sin efectos secundarios, sin dependencias de UI.
 */

import { LIMITE_ANUAL_RESICO } from "./constants";

export type { } from "./constants"; // re-export implícito para facilitar imports

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface TransaccionSimple {
  monto: number;
  tipo: string;  // "ingreso" | "INGRESO" (case-insensitive en el motor)
  fecha: string; // ISO-8601 "YYYY-MM-DD"
}

/**
 * Estado tributario del contribuyente en RESICO.
 * Se deriva del acumulado anual y se persiste en el perfil de negocio.
 */
export type EstadoTributario =
  | "RESICO_ACTIVO"
  | "RESICO_SUSPENDIDO_POR_EXCESO";

// ─── Funciones puras ─────────────────────────────────────────────────────────

/**
 * Suma todos los ingresos de un año fiscal determinado.
 *
 * @param transacciones - Arreglo de movimientos (puede incluir gastos).
 * @param anioFiscal    - Año de cuatro dígitos (ej. 2025).
 * @returns             Acumulado de ingresos en el año, como número de precisión 2.
 */
export function calcularAcumuladoAnual(
  transacciones: TransaccionSimple[],
  anioFiscal: number,
): number {
  return transacciones
    .filter(
      (t) =>
        t.tipo.toLowerCase() === "ingreso" &&
        new Date(t.fecha + "T00:00:00").getFullYear() === anioFiscal,
    )
    .reduce((acc, t) => acc + (Number(t.monto) || 0), 0);
}

/**
 * Valida si un nuevo ingreso puede registrarse sin superar el tope RESICO.
 *
 * @param ingresoAcumulado - Total de ingresos ya registrados en el año.
 * @param nuevoIngreso     - Monto que se desea registrar.
 * @returns `true` si la operación es válida; `false` si excedería el límite.
 */
export function validarTopeResico(
  ingresoAcumulado: number,
  nuevoIngreso: number,
): boolean {
  return ingresoAcumulado + nuevoIngreso <= LIMITE_ANUAL_RESICO;
}

/**
 * Calcula el porcentaje de consumo del límite anual RESICO (0–100+).
 *
 * @param ingresoAcumulado - Total de ingresos del año.
 * @returns Porcentaje consumido del límite (puede superar 100 si hay exceso).
 */
export function porcentajeConsumoResico(ingresoAcumulado: number): number {
  if (LIMITE_ANUAL_RESICO === 0) return 100;
  return (ingresoAcumulado / LIMITE_ANUAL_RESICO) * 100;
}

/**
 * Determina el estado tributario según el acumulado anual.
 */
export function derivarEstadoTributario(
  ingresoAcumulado: number,
): EstadoTributario {
  return ingresoAcumulado > LIMITE_ANUAL_RESICO
    ? "RESICO_SUSPENDIDO_POR_EXCESO"
    : "RESICO_ACTIVO";
}
