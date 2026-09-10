import { Router } from 'express';
import { getDatabase } from '../db/database.js';
import { getEngine, getDbCircuitBreaker } from '../services/parcel.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Liveness probe — just confirms the process is alive
router.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness probe — checks all subsystems
router.get('/ready', (_req, res) => {
  const checks: Record<string, boolean | string> = {
    database: false,
    rulesLoaded: false,
    engineReady: false,
    dbCircuitBreaker: 'unknown',
  };

  try {
    const db = getDatabase();
    db.prepare('SELECT 1').get();
    checks.database = true;
  } catch (error) {
    logger.warn({ error }, 'Database health check failed');
  }

  try {
    const engine = getEngine();
    checks.engineReady = engine !== undefined;
    checks.rulesLoaded = engine.getRuleCount() > 0;
  } catch (error) {
    logger.warn({ error }, 'Engine health check failed');
  }

  try {
    const cb = getDbCircuitBreaker();
    checks.dbCircuitBreaker = cb.getState();
  } catch {
    // Not initialized yet
  }

  const healthy = checks.database && checks.rulesLoaded && checks.engineReady;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRoutes };
