/**
 * Lógica fiscal compartida para Supabase Edge Functions.
 * RESICO Personas Físicas (México)
 */

export const IVA_RATE = 0.16;

export const TABLA_ISR_RESICO = [
  { hasta: 25000, tasa: 0.01 },
  { hasta: 50000, tasa: 0.011 },
  { hasta: 83333.33, tasa: 0.015 },
  { hasta: 208333.33, tasa: 0.02 },
  { hasta: 3500000, tasa: 0.025 },
];

export function calcularIVA(total: number) {
  const subtotal = total / (1 + IVA_RATE);
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    iva: Math.round((total - subtotal) * 100) / 100
  };
}

export function obtenerTasaISR(ingresosSubtotal: number) {
  for (const r of TABLA_ISR_RESICO) {
    if (ingresosSubtotal <= r.hasta) return r.tasa;
  }
  return 0.025;
}

export function calcularResumenFiscal(movimientos: any[]) {
  let ingresosTotal = 0;
  let ingresosSubtotal = 0;
  let ivaCobrado = 0;
  let gastosTotal = 0;
  let gastosSubtotal = 0;
  let ivaAcreditable = 0;

  for (const m of movimientos) {
    const monto = Number(m.monto) || 0;
    const conFactura = m.con_factura !== false;
    const { subtotal, iva } = calcularIVA(monto);

    if (m.tipo === 'INGRESO') {
      ingresosTotal += monto;
      ingresosSubtotal += subtotal;
      if (conFactura) ivaCobrado += iva;
    } else {
      gastosTotal += monto;
      gastosSubtotal += subtotal;
      if (conFactura) ivaAcreditable += iva;
    }
  }

  const tasaISR = obtenerTasaISR(ingresosSubtotal);
  const isr = Math.round(ingresosSubtotal * tasaISR * 100) / 100;
  const ivaAPagar = Math.max(Math.round((ivaCobrado - ivaAcreditable) * 100) / 100, 0);

  return {
    ingresosTotal: Math.round(ingresosTotal * 100) / 100,
    ingresosSubtotal: Math.round(ingresosSubtotal * 100) / 100,
    ivaCobrado: Math.round(ivaCobrado * 100) / 100,
    gastosTotal: Math.round(gastosTotal * 100) / 100,
    ivaAcreditable: Math.round(ivaAcreditable * 100) / 100,
    isr,
    tasaISR,
    ivaAPagar,
    totalImpuestos: Math.round((isr + ivaAPagar) * 100) / 100
  };
}
