import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import cookieParser from 'cookie-parser';
import { applySecurityMiddleware } from './middleware/security.js';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { parcelRoutes } from './routes/parcel.routes.js';
import { routingRoutes } from './routes/routing.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { metricsRoutes } from './routes/metrics.routes.js';
import { config } from './config/app.config.js';

export function createApp(): express.Express {
  const app = express();

  // Trust proxy (needed for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // Request ID for correlation
  app.use(requestId);

  // Security middleware
  applySecurityMiddleware(app);

  // Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Request logging
  app.use(requestLogger);

  // API routes
  app.use('/api/parcels', parcelRoutes);
  app.use('/api/routing', routingRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/metrics', metricsRoutes);

  // In production, serve the built React app (skip on Vercel — it serves static files separately)
  if (config.nodeEnv === 'production' && !process.env.VERCEL) {
    const clientDist = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    // SPA fallback: serve index.html for non-API routes
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // Global error handler
  app.use(errorHandler);

  return app;
}
