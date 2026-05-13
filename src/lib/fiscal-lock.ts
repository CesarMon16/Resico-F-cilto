/**
 * Protocolo de Restricción Fiscal CFF-32
 * Lógica de Barrera Temporal para Declaraciones
 */

/**
 * Verifica si un periodo fiscal (mes/año) es elegible para ser declarado.
 * Según la normativa, solo se puede declarar un periodo una vez concluido el mismo.
 * 
 * @param periodo El mes que se desea declarar (primer día del mes)
 * @param fechaActual Fecha de referencia (por defecto ahora)
 * @returns { elegible: boolean, codigo: string }
 */
export function verificarElegibilidadDeclaracion(
  periodo: Date,
  fechaActual: Date = new Date()
): { elegible: boolean; codigo: string } {
  // Obtener el primer día del mes siguiente al periodo
  const mesSiguiente = new Date(periodo.getFullYear(), periodo.getMonth() + 1, 1);
  
  // Comparar con la fecha actual
  if (fechaActual.getTime() < mesSiguiente.getTime()) {
    return {
      elegible: false,
      codigo: "ERR_PERIOD_NOT_CLOSED"
    };
  }

  return {
    elegible: true,
    codigo: "SUCCESS"
  };
}

/**
 * Genera el rango ISO 8601 para filtrado de transacciones de un periodo
 */
export function getRangoPeriodo(anio: number, mes: number) {
  const start = new Date(anio, mes - 1, 1);
  const end = new Date(anio, mes, 0); // Último día del mes
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}
