import { describe, expect, test } from "vitest";
import { 
  desglosarIVA, 
  aplicarIVA, 
  calcularISRResico, 
  validarRFC, 
  calcularResumen,
  type Movimiento
} from "./fiscal";

describe("Cálculos de IVA", () => {
  test("desglosarIVA: calcula subtotal e IVA correctamente para tasa 16%", () => {
    const { subtotal, iva } = desglosarIVA(116);
    expect(subtotal).toBe(100);
    expect(iva).toBe(16);
  });

  test("desglosarIVA: maneja montos con decimales", () => {
    const { subtotal, iva } = desglosarIVA(150.50);
    // 150.50 / 1.16 = 129.7413... -> 129.74
    // 150.50 - 129.74 = 20.76
    expect(subtotal).toBe(129.74);
    expect(iva).toBe(20.76);
  });

  test("aplicarIVA: calcula total con IVA correctamente", () => {
    const { total, iva } = aplicarIVA(100);
    expect(total).toBe(116);
    expect(iva).toBe(16);
  });
});

describe("Cálculos de ISR RESICO", () => {
  test("calcularISRResico: aplica tasa del 1% para ingresos bajos", () => {
    const { isr, tasa } = calcularISRResico(10000);
    expect(tasa).toBe(0.01);
    expect(isr).toBe(100);
  });

  test("calcularISRResico: aplica tasa del 2.5% para el límite máximo", () => {
    const { isr, tasa } = calcularISRResico(3_500_000);
    expect(tasa).toBe(0.025);
    expect(isr).toBe(87500);
  });
});

describe("Validación de RFC", () => {
  test("validarRFC: acepta RFC de persona física válido", () => {
    expect(validarRFC("GOMA840101XYZ")).toBe(true);
  });

  test("validarRFC: acepta RFC de persona moral válido", () => {
    expect(validarRFC("ABC010101123")).toBe(true);
  });

  test("validarRFC: rechaza RFC inválido", () => {
    expect(validarRFC("INVALIDO")).toBe(false);
    expect(validarRFC("1234567890123")).toBe(false);
  });
});

describe("Motor de Resumen Fiscal", () => {
  test("calcularResumen: calcula correctamente utilidad e impuestos con IVA acreditable", () => {
    const movimientos: Movimiento[] = [
      { tipo: "INGRESO", monto: 1160, con_factura: true, fecha: "2025-01-01" }, // Subtotal: 1000, IVA: 160
      { tipo: "GASTO", monto: 580, con_factura: true, fecha: "2025-01-02" },   // Subtotal: 500, IVA: 80
    ];

    const resumen = calcularResumen(movimientos);

    expect(resumen.ingresosSubtotal).toBe(1000);
    expect(resumen.gastosSubtotal).toBe(500);
    expect(resumen.utilidad).toBe(500);
    expect(resumen.ivaCobrado).toBe(160);
    expect(resumen.ivaAcreditable).toBe(80);
    expect(resumen.ivaAPagar).toBe(80);
    expect(resumen.isr).toBe(10); // 1000 * 1% = 10
  });

  test("calcularResumen: el IVA de gastos sin factura no es acreditable", () => {
    const movimientos: Movimiento[] = [
      { tipo: "INGRESO", monto: 1160, con_factura: true, fecha: "2025-01-01" },
      { tipo: "GASTO", monto: 580, con_factura: false, fecha: "2025-01-02" }, 
    ];

    const resumen = calcularResumen(movimientos);

    expect(resumen.ivaCobrado).toBe(160);
    expect(resumen.ivaAcreditable).toBe(0);
    expect(resumen.ivaAPagar).toBe(160);
  });
});
