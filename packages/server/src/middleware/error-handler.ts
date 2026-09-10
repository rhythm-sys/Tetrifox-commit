import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { metricsCollector } from '../monitoring/metrics.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error({ err }, 'Unhandled error');
  metricsCollector.recordError();

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
