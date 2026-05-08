import type { Transaction } from "@/components/TransactionItem";

// Static data structure
export let mockTransactions: Transaction[] = [
  { id: "1", tipo: "ingreso", monto: 3500, descripcion: "Venta del día - tienda", fecha: "2026-03-19" },
  { id: "2", tipo: "gasto", monto: 800, descripcion: "Compra de mercancía", fecha: "2026-03-19" },
  { id: "3", tipo: "ingreso", monto: 2100, descripcion: "Venta del día - tienda", fecha: "2026-03-18" },
  { id: "4", tipo: "gasto", monto: 350, descripcion: "Luz del local", fecha: "2026-03-17" },
  { id: "5", tipo: "ingreso", monto: 4200, descripcion: "Venta del día - tienda", fecha: "2026-03-17" },
  { id: "6", tipo: "gasto", monto: 1200, descripcion: "Renta del local", fecha: "2026-03-15" },
  { id: "7", tipo: "ingreso", monto: 1800, descripcion: "Venta especial", fecha: "2026-03-14" },
  { id: "8", tipo: "gasto", monto: 450, descripcion: "Material de limpieza", fecha: "2026-03-13" },
];

export const mockSummary = {
  ingresos: 45600,
  gastos: 18200,
  periodo: "Marzo 2026",
};

export interface TransactionPayload {
  tipo: 'ingreso' | 'gasto';
  monto: number;
  fecha: string;
  descripcion: string;
}

// API Mocking adapter
export const apiMock = {
  getTransactions: async (): Promise<Transaction[]> => {
    return new Promise((resolve) => {
      const delay = Math.floor(Math.random() * 150) + 150; // 150ms - 300ms
      setTimeout(() => resolve([...mockTransactions]), delay);
    });
  },

  saveTransaction: async (payload: TransactionPayload): Promise<{ success: boolean; data?: Transaction; error?: string }> => {
    return new Promise((resolve) => {
      const delay = Math.floor(Math.random() * 150) + 150; // 150ms - 300ms
      
      setTimeout(() => {
        // Validación del lado del "servidor"
        if (payload.monto <= 0.01) {
          resolve({ success: false, error: "El monto debe ser mayor a 0.01" });
          return;
        }
        if (typeof payload.monto !== "number" || isNaN(payload.monto)) {
          resolve({ success: false, error: "El monto debe ser un valor numérico" });
          return;
        }

        const newTx: Transaction = {
          id: `mock-${Date.now()}`,
          tipo: payload.tipo,
          monto: payload.monto,
          fecha: payload.fecha,
          descripcion: payload.descripcion || "",
        };

        // Mutar estado estático simulando DB insert
        mockTransactions = [newTx, ...mockTransactions];
        
        resolve({ success: true, data: newTx });
      }, delay);
    });
  }
};
