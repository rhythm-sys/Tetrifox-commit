import { Router } from 'express';
import { HistoryQuerySchema } from '@parcel-routing/shared';
import { validateQuery } from '../middleware/validation.js';
import { getEngine } from '../services/parcel.service.js';
import { queryRoutingHistory, getRecentHistory, getRouteCounts } from '../db/repositories/routing-history.repo.js';

const router = Router();

// Get current routing rules (read-only view)
router.get('/rules', (_req, res) => {
  const engine = getEngine();
  const rules = engine.getRules().map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    priority: r.priority,
    enabled: r.enabled,
    conditions: r.conditions,
    action: r.action,
  }));

  res.json({ success: true, data: rules });
});

// Get routing history with pagination and filters
router.get('/history', validateQuery(HistoryQuerySchema), (req, res) => {
  const query = req.query as unknown as {
    page: number;
    pageSize: number;
    department?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };

  const result = queryRoutingHistory(query);

  res.json({
    success: true,
    data: result.data,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalCount: result.totalCount,
      totalPages: Math.ceil(result.totalCount / query.pageSize),
    },
  });
});

// Get recent routing activity
router.get('/recent', (_req, res) => {
  const data = getRecentHistory(10);
  res.json({ success: true, data });
});

// Get route distribution counts
router.get('/stats', (_req, res) => {
  const routeCounts = getRouteCounts();
  res.json({ success: true, data: { routeCounts } });
});

export { router as routingRoutes };
