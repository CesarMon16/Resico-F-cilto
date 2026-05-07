import type { Transaction } from "@/components/TransactionItem";

export const mockTransactions: Transaction[] = [
  { id: "1", tipo: "ingreso", monto: 3500, descripcion: "Venta del día - tienda", fecha: "19 Mar 2026" },
  { id: "2", tipo: "gasto", monto: 800, descripcion: "Compra de mercancía", fecha: "19 Mar 2026" },
  { id: "3", tipo: "ingreso", monto: 2100, descripcion: "Venta del día - tienda", fecha: "18 Mar 2026" },
  { id: "4", tipo: "gasto", monto: 350, descripcion: "Luz del local", fecha: "17 Mar 2026" },
  { id: "5", tipo: "ingreso", monto: 4200, descripcion: "Venta del día - tienda", fecha: "17 Mar 2026" },
  { id: "6", tipo: "gasto", monto: 1200, descripcion: "Renta del local", fecha: "15 Mar 2026" },
  { id: "7", tipo: "ingreso", monto: 1800, descripcion: "Venta especial", fecha: "14 Mar 2026" },
  { id: "8", tipo: "gasto", monto: 450, descripcion: "Material de limpieza", fecha: "13 Mar 2026" },
];

export const mockSummary = {
  ingresos: 45600,
  gastos: 18200,
  periodo: "Marzo 2026",
};
