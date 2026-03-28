import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function globalErrorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  logger.error({
    message: err.message || 'Error desconocido',
    stack:   err.stack,
    method:  req.method,
    path:    req.path,
    status:  err.status ?? err.statusCode ?? 500,
  });

  const statusCode = typeof err.status === 'number' ? err.status
                   : typeof err.statusCode === 'number' ? err.statusCode
                   : 500;

  res.status(statusCode).json({ error: 'Error interno del servidor' });
}
