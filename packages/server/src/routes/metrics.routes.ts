import { Router } from 'express';
import { metricsCollector } from '../monitoring/metrics.js';

const router = Router();

router.get('/', (_req, res) => {
  const metrics = metricsCollector.getMetrics();
  res.json({ success: true, data: metrics });
});

export { router as metricsRoutes };
