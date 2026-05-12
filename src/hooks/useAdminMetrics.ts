import { useState, useEffect } from "react";
import { mockTransactions } from "@/lib/mockData";

export interface AdminMetrics {
  total_usuarios: number;
  tasa_crecimiento_mensual: number;
  distribucion_giros: Array<{ giro: string; cantidad: number }>;
}

/**
 * Hook para recuperación de métricas de administrador emuladas.
 * Implementado para el Protocolo de Implementación de Módulos de Gestión Fase 1.
 */
export function useAdminMetrics() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      // Simulación de latencia de red de 200ms
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Datos emulados basados en el contexto de mockData
      const total_usuarios = 1240;
      const tasa_crecimiento_mensual = 12.5;
      
      // Distribución de giros determinista
      const distribucion_giros = [
        { giro: "Tiendas / Abarrotes", cantidad: 450 },
        { giro: "Servicios Profesionales", cantidad: 320 },
        { giro: "Comida / Restaurantes", cantidad: 215 },
        { giro: "Transporte", cantidad: 180 },
        { giro: "Otros", cantidad: 75 },
      ];

      setMetrics({
        total_usuarios,
        tasa_crecimiento_mensual,
        distribucion_giros,
      });
      setLoading(false);
    };

    fetchMetrics();
  }, []);

  return { metrics, loading };
}
