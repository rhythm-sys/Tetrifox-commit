import { createApp } from './app.js';
import { initDatabase, closeDatabase } from './db/database.js';
import { initParcelService, getRuleLoader } from './services/parcel.service.js';
import { anomalyDetector } from './monitoring/anomaly-detector.js';
import { logger } from './utils/logger.js';
import { config } from './config/app.config.js';
import type { Server } from 'node:http';

let server: Server;

function start(): void {
  initDatabase();
  initParcelService();
  anomalyDetector.start();

  const app = createApp();

  server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, 'Parcel Routing Server started');
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received, draining connections...');

    server.close(() => {
      logger.info('HTTP server closed');
      anomalyDetector.stop();
      getRuleLoader()?.stopWatching();
      closeDatabase();
      logger.info('All resources released, exiting');
      process.exit(0);
    });

    // Force exit after 10s if connections don't drain
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
