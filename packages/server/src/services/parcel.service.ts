import type { ParcelInput, RoutingResult, RuleConfig } from '@parcel-routing/shared';
import { RuleEngine } from '../engine/rule-engine.js';
import { RuleLoader } from '../engine/rule-loader.js';
import { insertRoutingRecord } from '../db/repositories/routing-history.repo.js';
import { logger } from '../utils/logger.js';
import { auditLogger } from '../utils/audit-logger.js';
import { metricsCollector } from '../monitoring/metrics.js';
import { CircuitBreaker } from '../utils/circuit-breaker.js';
import { config } from '../config/app.config.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let engine: RuleEngine;
let ruleLoader: RuleLoader;

// Circuit breaker for database writes — if DB is down,
// routing still works (returns result) but skips persistence.
const dbCircuitBreaker = new CircuitBreaker({
  name: 'database-write',
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxAttempts: 2,
});

export function initParcelService(): void {
  const rulesPath = path.resolve(__dirname, '..', '..', config.rulesPath);
  ruleLoader = new RuleLoader(rulesPath);

  const ruleConfig = ruleLoader.load();
  engine = new RuleEngine(ruleConfig);

  ruleLoader.on('rules-updated', (newConfig: RuleConfig) => {
    engine = new RuleEngine(newConfig);
    logger.info('Rule engine reconstructed with updated rules');
  });

  ruleLoader.watch();
}

export function routeParcel(parcel: ParcelInput, batchId?: string): RoutingResult {
  const start = performance.now();

  const result = engine.evaluate(parcel);

  const latency = performance.now() - start;
  metricsCollector.recordRouting(result.department || 'unrouted', latency);

  // Persist via circuit breaker — routing succeeds even if DB is down
  dbCircuitBreaker.execute(
    () => insertRoutingRecord(parcel, result, batchId),
    () => {
      logger.warn({ parcelId: result.parcelId }, 'DB circuit breaker open — routing record not persisted');
    }
  ).catch((error) => {
    logger.error({ error, parcelId: result.parcelId }, 'Failed to persist routing record');
    metricsCollector.recordError();
  });

  // Audit log — separate from request log for compliance/forensics
  auditLogger.logRouting(parcel, result);

  return result;
}

export function getEngine(): RuleEngine {
  return engine;
}

export function getRuleLoader(): RuleLoader {
  return ruleLoader;
}

export function getDbCircuitBreaker(): CircuitBreaker {
  return dbCircuitBreaker;
}
