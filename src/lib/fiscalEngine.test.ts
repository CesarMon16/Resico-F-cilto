/**
 * Pruebas unitarias del motor de validación fiscal RESICO.
 * Ejecutar con: npm test  (vitest run)
 */

import { describe, expect, test } from "vitest";
import {
  calcularAcumuladoAnual,
  validarTopeResico,
  porcentajeConsumoResico,
} from "./fiscalEngine";

// ─── validarTopeResico ────────────────────────────────────────────────────────

describe("validarTopeResico", () => {
  test("Debe retornar true cuando acumulado es 3,499,999.99 y nuevo ingreso es 0", () => {
    expect(validarTopeResico(3_499_999.99, 0)).toBe(true);
  });

  test("Debe retornar true en límite exacto (acumulado 3,500,000.00, nuevo 0)", () => {
    expect(validarTopeResico(3_500_000.0, 0)).toBe(true);
  });

  test("Debe retornar false y bloquear cuando acumulado 3,400,000 y nuevo ingreso 100,000.01", () => {
    expect(validarTopeResico(3_400_000, 100_000.01)).toBe(false);
  });

  test("Debe retornar false cuando la suma supera exactamente el límite en un centavo", () => {
    expect(validarTopeResico(3_500_000.0, 0.01)).toBe(false);
  });

  test("Debe retornar true cuando ambos valores son cero", () => {
    expect(validarTopeResico(0, 0)).toBe(true);
  });
});

// ─── calcularAcumuladoAnual ───────────────────────────────────────────────────

describe("calcularAcumuladoAnual", () => {
  const movimientos = [
    { monto: 50_000, tipo: "ingreso", fecha: "2025-01-15" },
    { monto: 80_000, tipo: "ingreso", fecha: "2025-06-20" },
    { monto: 20_000, tipo: "gasto",   fecha: "2025-03-10" }, // no debe sumar
    { monto: 70_000, tipo: "ingreso", fecha: "2024-12-01" }, // año distinto
    { monto: 30_000, tipo: "INGRESO", fecha: "2025-09-01" }, // tipo en mayúsculas
  ];

  test("Suma únicamente ingresos del año fiscal indicado", () => {
    // 50_000 + 80_000 + 30_000 = 160_000
    expect(calcularAcumuladoAnual(movimientos, 2025)).toBe(160_000);
  });

  test("No incluye ingresos de otros años", () => {
    expect(calcularAcumuladoAnual(movimientos, 2024)).toBe(70_000);
  });

  test("Devuelve 0 si no hay movimientos en el año", () => {
    expect(calcularAcumuladoAnual(movimientos, 2023)).toBe(0);
  });

  test("Devuelve 0 con arreglo vacío", () => {
    expect(calcularAcumuladoAnual([], 2025)).toBe(0);
  });
});

// ─── porcentajeConsumoResico ──────────────────────────────────────────────────

describe("porcentajeConsumoResico", () => {
  test("Devuelve 0 cuando acumulado es 0", () => {
    expect(porcentajeConsumoResico(0)).toBe(0);
  });

  test("Devuelve 50 cuando acumulado es la mitad del límite", () => {
    expect(porcentajeConsumoResico(1_750_000)).toBeCloseTo(50, 4);
  });

  test("Devuelve 100 cuando acumulado iguala el límite", () => {
    expect(porcentajeConsumoResico(3_500_000)).toBeCloseTo(100, 4);
  });

  test("Puede superar 100 si hay exceso (sin capping)", () => {
    expect(porcentajeConsumoResico(4_000_000)).toBeGreaterThan(100);
  });
});
