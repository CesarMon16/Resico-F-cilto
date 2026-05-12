import { supabase } from "@/integrations/supabase/client";
import { wrapError, AppError } from "@/lib/error-handler";
import { auditLog } from "@/lib/auditoria";

/**
 * Clase base para todos los servicios de dominio.
 * Implementa multi-tenancy forzado y manejo de errores.
 */
export abstract class BaseService {
  constructor(
    protected usuario_id: string,
    protected negocio_id: string
  ) {
    if (!usuario_id || !negocio_id) {
      throw new AppError('Se requiere usuario y negocio para inicializar el servicio', 'AUTH_REQUIRED');
    }
  }

  /**
   * Ejecuta una operación de base de datos con manejo de errores y validación de tenant.
   */
  protected async exec<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    actionName?: string,
    auditData?: any
  ): Promise<T> {
    try {
      const { data, error } = await operation();
      
      if (error) throw wrapError(error);
      
      if (actionName) {
        void auditLog(actionName, { ...auditData, negocio_id: this.negocio_id });
      }

      return data as T;
    } catch (err) {
      throw wrapError(err);
    }
  }

  /**
   * Retorna una consulta de Supabase con el filtro de negocio (tenant) aplicado.
   */
  protected from(table: string) {
    return supabase.from(table).select().eq('negocio_id', this.negocio_id);
  }
}
