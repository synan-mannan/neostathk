import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error Middleware]:', err);

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors,
    });
    return;
  }

  const statusCode = (err as { status?: number; statusCode?: number }).statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : (err as Error).message || 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
  });
}
