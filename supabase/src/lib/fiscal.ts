// Funciones reutilizables para cálculos fiscales RESICO Persona Física (México)
// Filosofía: el usuario captura el TOTAL cobrado/pagado y nosotros derivamos
// el subtotal y el IVA al 16% en background. Si la transacción no tiene factura,
// el IVA no es acreditable / trasladable.

export const IVA_RATE = 0.16;

export interface RangoISR {
  hasta: number;
  tasa: number; // como decimal (0.01 = 1%)
}

// Tabla RESICO Personas Físicas vigente
export const TABLA_ISR_RESICO: RangoISR[] = [
  { hasta: 25000, tasa: 0.01 },
  { hasta: 50000, tasa: 0.011 },
  { hasta: 83333.33, tasa: 0.015 },
  { hasta: 208333.33, tasa: 0.02 },
  { hasta: 3500000, tasa: 0.025 },
];

export const LIMITE_ANUAL_RESICO = 3500000;

/** Formatea un número como pesos mexicanos */
export function formatMXN(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

/** Dado un total que ya incluye IVA, devuelve subtotal e IVA */
export function desglosarIVA(total: number): { subtotal: number; iva: number } {
  const subtotal = total / (1 + IVA_RATE);
  const iva = total - subtotal;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    iva: Math.round(iva * 100) / 100,
  };
}

/** Dado un subtotal, devuelve total con IVA al 16% */
export function aplicarIVA(subtotal: number): { iva: number; total: number } {
  const iva = subtotal * IVA_RATE;
  return {
    iva: Math.round(iva * 100) / 100,
    total: Math.round((subtotal + iva) * 100) / 100,
  };
}

/** Calcula tasa ISR RESICO según ingresos del mes */
export function tasaISRResico(ingresosMes: number): number {
  for (const r of TABLA_ISR_RESICO) {
    if (ingresosMes <= r.hasta) return r.tasa;
  }
  return TABLA_ISR_RESICO[TABLA_ISR_RESICO.length - 1].tasa;
}

/** ISR estimado RESICO sobre ingresos cobrados (NO se restan gastos) */
export function calcularISRResico(ingresosMes: number): {
  isr: number;
  tasa: number;
  base: number;
} {
  const tasa = tasaISRResico(ingresosMes);
  const isr = Math.round(ingresosMes * tasa * 100) / 100;
  return { isr, tasa, base: ingresosMes };
}

export interface Movimiento {
  tipo: "INGRESO" | "GASTO";
  monto: number; // total con IVA
  con_factura?: boolean | null;
  fecha: string;
}

export interface ResumenFiscal {
  ingresosTotal: number;        // total cobrado (con IVA)
  ingresosSubtotal: number;     // base gravable ISR
  ivaCobrado: number;
  gastosTotal: number;          // total pagado (con IVA)
  gastosSubtotal: number;
  ivaAcreditable: number;       // solo gastos con factura
  utilidad: number;             // subtotal ingresos - subtotal gastos
  isr: number;
  tasaISR: number;
  ivaAPagar: number;            // puede ser negativo (saldo a favor)
  totalImpuestos: number;       // ISR + max(IVA a pagar, 0)
}

export function calcularResumen(movimientos: Movimiento[]): ResumenFiscal {
  let ingresosTotal = 0;
  let ingresosSubtotal = 0;
  let ivaCobrado = 0;
  let gastosTotal = 0;
  let gastosSubtotal = 0;
  let ivaAcreditable = 0;

  for (const m of movimientos) {
    const monto = Number(m.monto) || 0;
    const conFactura = m.con_factura !== false;
    const { subtotal, iva } = desglosarIVA(monto);

    if (m.tipo === "INGRESO") {
      ingresosTotal += monto;
      ingresosSubtotal += subtotal;
      if (conFactura) ivaCobrado += iva;
    } else {
      gastosTotal += monto;
      gastosSubtotal += subtotal;
      if (conFactura) ivaAcreditable += iva;
    }
  }

  const r = (n: number) => Math.round(n * 100) / 100;
  const { isr, tasa } = calcularISRResico(ingresosSubtotal);
  const ivaAPagar = r(ivaCobrado - ivaAcreditable);
  const utilidad = r(ingresosSubtotal - gastosSubtotal);

  return {
    ingresosTotal: r(ingresosTotal),
    ingresosSubtotal: r(ingresosSubtotal),
    ivaCobrado: r(ivaCobrado),
    gastosTotal: r(gastosTotal),
    gastosSubtotal: r(gastosSubtotal),
    ivaAcreditable: r(ivaAcreditable),
    utilidad,
    isr,
    tasaISR: tasa,
    ivaAPagar,
    totalImpuestos: r(isr + Math.max(ivaAPagar, 0)),
  };
}

/** Filtra movimientos por mes (1-12) y año */
export function filtrarPorPeriodo<T extends { fecha: string }>(
  movs: T[],
  mes: number,
  anio: number
): T[] {
  return movs.filter((m) => {
    const d = new Date(m.fecha + "T00:00:00");
    return d.getMonth() + 1 === mes && d.getFullYear() === anio;
  });
}

/** Validación básica de RFC mexicano (persona física: 13 chars; moral: 12) */
export function validarRFC(rfc: string): boolean {
  if (!rfc) return false;
  const v = rfc.trim().toUpperCase();
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(v);
}

export const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
