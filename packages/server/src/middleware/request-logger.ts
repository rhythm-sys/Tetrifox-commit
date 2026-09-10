import pinoHttp from 'pino-http';
import { logger } from '../utils/logger.js';

export const requestLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => {
      // Don't log health checks to avoid noise
      return req.url === '/api/health';
    },
  },
});
