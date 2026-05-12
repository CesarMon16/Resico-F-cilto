import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

/**
 * Hook para verificar fechas límite fiscales (Días 10 al 17 de cada mes).
 * Implementado para el Protocolo de Refinamiento UX/IA Fase 3.
 */
export function useFiscalDeadlineCheck() {
  useEffect(() => {
    const currentDay = new Date().getDate();
    const isDeadlinePeriod = currentDay >= 10 && currentDay <= 17;
    const alreadyShown = sessionStorage.getItem("deadline_toast_shown");

    if (isDeadlinePeriod && !alreadyShown) {
      // Pequeño delay para asegurar montaje del DOM
      const timer = setTimeout(() => {
        toast({
          title: "Alerta de Cumplimiento Fiscal",
          description: "Fecha límite de declaración mensual de ISR/IVA: Día 17. Evite recargos.",
          variant: "destructive",
        });
        sessionStorage.setItem("deadline_toast_shown", "true");
      }, 100);

      return () => clearTimeout(timer);
    }
  }, []);
}
