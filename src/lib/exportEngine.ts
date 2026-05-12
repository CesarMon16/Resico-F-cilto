import { Transaction } from "@/components/TransactionItem";

/**
 * Motor de exportación de artefactos binarios.
 * Implementado para el Protocolo de Implementación de Módulos de Gestión Fase 2.
 */
export function generarReporteMensualCSV(
  transacciones: Array<any>,
  mes: number,
  anio: number
): void {
  const t0 = performance.now();

  // 1. Filtrar por mes y año (aunque ya deberían venir filtrados del hook, aseguramos integridad)
  const filtradas = transacciones.filter((t) => {
    const fecha = new Date(t.fecha + "T00:00:00");
    return (fecha.getMonth() + 1) === mes && fecha.getFullYear() === anio;
  });

  // 2. Lógica de Serialización (CSV) - RFC 4180
  const headers = "ID,Fecha,Tipo,Concepto,Monto";
  const rows = filtradas.map((t) => {
    const concepto = (t.descripcion || "").replace(/"/g, '""'); // Escapar comillas
    return `${t.id},${t.fecha},${t.tipo},"${concepto}",${t.monto}`;
  });

  const csvContent = [headers, ...rows].join("\n");

  // 3. Creación del Blob
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  // 4. Lógica de Descarga
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = `resico_reporte_${String(mes).padStart(2, "0")}_${anio}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  const t1 = performance.now();
  console.log(`[ExportEngine] Reporte generado en ${(t1 - t0).toFixed(2)}ms para ${filtradas.length} registros.`);
}
