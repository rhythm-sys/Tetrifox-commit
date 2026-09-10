import { Router } from 'express';
import multer from 'multer';
import { ParcelInputSchema } from '@parcel-routing/shared';
import { validateBody } from '../middleware/validation.js';
import { routeParcel } from '../services/parcel.service.js';
import { createBatchJob, processBatch, getBatchJob, computeBatchHash, findExistingJob } from '../services/batch.service.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/app.config.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.batch.maxFileSizeMB * 1024 * 1024 },
});

// Route a single parcel
router.post('/route', validateBody(ParcelInputSchema), (req, res) => {
  try {
    const result = routeParcel(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error({ error }, 'Failed to route parcel');
    res.status(500).json({
      success: false,
      error: { code: 'ROUTING_ERROR', message: 'Failed to route parcel' },
    });
  }
});

// Upload and process a batch
router.post('/batch', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded. Send a JSON file as "file" field.' },
      });
      return;
    }

    const content = req.file.buffer.toString('utf-8');
    let parcels: unknown[];

    try {
      parcels = JSON.parse(content);
    } catch {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_JSON', message: 'File does not contain valid JSON' },
      });
      return;
    }

    if (!Array.isArray(parcels)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_FORMAT', message: 'JSON must be an array of parcels' },
      });
      return;
    }

    if (parcels.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'EMPTY_BATCH', message: 'Batch must contain at least one parcel' },
      });
      return;
    }

    if (parcels.length > 100_000) {
      res.status(400).json({
        success: false,
        error: { code: 'BATCH_TOO_LARGE', message: 'Batch cannot exceed 100,000 parcels' },
      });
      return;
    }

    // Idempotency: check if this exact file was already processed
    const contentHash = computeBatchHash(content);
    const existing = findExistingJob(contentHash);
    if (existing) {
      logger.info({ jobId: existing.id, contentHash }, 'Duplicate batch detected, returning existing job');
      res.status(200).json({ success: true, data: { jobId: existing.id, duplicate: true } });
      return;
    }

    const jobId = createBatchJob(req.file.originalname || 'upload.json', contentHash);

    // Process in the background
    processBatch(jobId, parcels).catch((error) => {
      logger.error({ error, jobId }, 'Batch processing failed');
    });

    res.status(202).json({ success: true, data: { jobId } });
  } catch (error) {
    logger.error({ error }, 'Batch upload failed');
    res.status(500).json({
      success: false,
      error: { code: 'BATCH_ERROR', message: 'Failed to process batch upload' },
    });
  }
});

// Get batch job status
router.get('/batch/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = getBatchJob(jobId);

  if (!job) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Batch job ${jobId} not found` },
    });
    return;
  }

  res.json({ success: true, data: job });
});

export { router as parcelRoutes };
