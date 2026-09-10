import pinoHttp from 'pino-http';
import { logger } from '../utils/logger.js';

// @ts-expect-error pino-http default export typing mismatch
export const requestLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req: { url?: string }) => {
      return req.url === '/api/health';
    },
  },
});
