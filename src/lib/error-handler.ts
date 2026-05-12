/**
 * Sistema centralizado de manejo de errores para la plataforma SaaS.
 * Define tipos de errores específicos y una utilidad para procesarlos.
 */

export type ErrorCode = 
  | 'AUTH_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TENANT_MISMATCH';

export class AppError extends Error {
  constructor(
    public message: string,
    public code: ErrorCode = 'INTERNAL_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Procesa errores de Supabase o excepciones genéricas y los convierte a AppError.
 */
export function wrapError(err: any): AppError {
  if (err instanceof AppError) return err;

  // Errores de Supabase
  if (err.code && err.message) {
    if (err.code === 'PGRST116') return new AppError('No se encontró el registro', 'NOT_FOUND');
    if (err.code === '42501') return new AppError('No tienes permiso para esta acción', 'PERMISSION_DENIED');
    return new AppError(err.message, 'INTERNAL_ERROR', err);
  }

  if (err instanceof Error) return new AppError(err.message);
  
  return new AppError('Ocurrió un error inesperado', 'INTERNAL_ERROR', err);
}
