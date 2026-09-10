import type { ParcelInput, BatchJob, BatchError } from '@parcel-routing/shared';
import { ParcelInputSchema } from '@parcel-routing/shared';
import { routeParcel } from './parcel.service.js';
import { getDatabase } from '../db/database.js';
import { logger } from '../utils/logger.js';
import { auditLogger } from '../utils/audit-logger.js';
import { nanoid } from 'nanoid';
import crypto from 'node:crypto';

const activeJobs = new Map<string, BatchJob>();

/**
 * Generate a content hash for idempotency —
 * same file content produces the same hash, preventing duplicate processing.
 */
export function computeBatchHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function findExistingJob(contentHash: string): BatchJob | undefined {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM batch_jobs WHERE content_hash = ? AND status != ?').get(contentHash, 'failed') as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return mapBatchRow(row);
}

export function createBatchJob(filename: string, contentHash: string): string {
  const jobId = `batch_${nanoid(10)}`;
  const job: BatchJob = {
    id: jobId,
    filename,
    totalCount: 0,
    processed: 0,
    successCount: 0,
    errorCount: 0,
    status: 'processing',
    errors: [],
    createdAt: new Date().toISOString(),
  };

  activeJobs.set(jobId, job);

  const db = getDatabase();
  db.prepare(
    'INSERT INTO batch_jobs (id, filename, status, content_hash) VALUES (?, ?, ?, ?)'
  ).run(jobId, filename, 'processing', contentHash);

  return jobId;
}

export async function processBatch(
  jobId: string,
  parcels: unknown[],
  onProgress?: (job: BatchJob) => void
): Promise<BatchJob> {
  const job = activeJobs.get(jobId);
  if (!job) throw new Error(`Batch job ${jobId} not found`);

  job.totalCount = parcels.length;
  const db = getDatabase();

  db.prepare('UPDATE batch_jobs SET total_count = ? WHERE id = ?').run(parcels.length, jobId);

  // Use a transaction for the entire batch to ensure consistency
  const insertBatch = db.transaction(() => {
    for (let i = 0; i < parcels.length; i++) {
      try {
        const validated = ParcelInputSchema.parse(parcels[i]);
        routeParcel(validated, jobId);
        job.successCount++;
      } catch (error) {
        const batchError: BatchError = {
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
          // Don't leak raw parcel data in error responses (PII risk)
        };
        job.errors.push(batchError);
        job.errorCount++;
        logger.warn({ jobId, index: i, error: batchError.error }, 'Batch item failed');
      }

      job.processed++;

      if (onProgress && (job.processed % 100 === 0 || job.processed === job.totalCount)) {
        onProgress({ ...job });
      }
    }
  });

  try {
    insertBatch();
  } catch (error) {
    logger.error({ error, jobId }, 'Batch transaction failed');
    job.status = 'failed';
  }

  // Proper status determination
  if (job.status !== 'failed') {
    if (job.errorCount === job.totalCount) {
      job.status = 'failed';
    } else if (job.errorCount > 0) {
      job.status = 'completed'; // partial success — errorCount > 0 signals partial
    } else {
      job.status = 'completed';
    }
  }

  job.completedAt = new Date().toISOString();

  db.prepare(
    'UPDATE batch_jobs SET total_count = ?, processed = ?, success_count = ?, error_count = ?, status = ?, errors = ?, completed_at = ? WHERE id = ?'
  ).run(job.totalCount, job.processed, job.successCount, job.errorCount, job.status, JSON.stringify(job.errors), job.completedAt, jobId);

  activeJobs.delete(jobId);
  logger.info({ jobId, total: job.totalCount, success: job.successCount, errors: job.errorCount }, 'Batch processing complete');
  auditLogger.logBatchCompleted(jobId, { total: job.totalCount, success: job.successCount, errors: job.errorCount });
  return job;
}

export function getBatchJob(jobId: string): BatchJob | undefined {
  const active = activeJobs.get(jobId);
  if (active) return { ...active };

  const db = getDatabase();
  const row = db.prepare('SELECT * FROM batch_jobs WHERE id = ?').get(jobId) as Record<string, unknown> | undefined;
  if (!row) return undefined;

  return mapBatchRow(row);
}

function mapBatchRow(row: Record<string, unknown>): BatchJob {
  let errors: BatchError[] = [];
  try {
    errors = row.errors ? JSON.parse(row.errors as string) : [];
  } catch {
    logger.warn({ jobId: row.id }, 'Failed to parse batch errors JSON');
  }

  return {
    id: row.id as string,
    filename: row.filename as string,
    totalCount: row.total_count as number,
    processed: row.processed as number,
    successCount: row.success_count as number,
    errorCount: row.error_count as number,
    status: row.status as BatchJob['status'],
    errors,
    createdAt: row.created_at as string,
    completedAt: row.completed_at as string | undefined,
  };
}
