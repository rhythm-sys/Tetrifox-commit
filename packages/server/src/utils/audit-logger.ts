import pino from 'pino';
import { config } from '../config/app.config.js';
import type { ParcelInput, RoutingResult } from '@parcel-routing/shared';

/**
 * Structured audit logger — separate from request/application logs.
 *
 * Purpose: compliance, forensics, dispute resolution.
 * Each entry contains the full decision context: what went in, what came out,
 * and which rules were applied. This is the source of truth for "why was
 * this parcel routed there?"
 *
 * In production, this would typically ship to a tamper-proof log store
 * (e.g., CloudWatch, Splunk, or an append-only DB table).
 */
const audit = pino({
  level: 'info',
  transport: config.nodeEnv === 'development'
    ? { target: 'pino-pretty', options: { colorize: true, messageFormat: '[AUDIT] {msg}' } }
    : undefined,
  base: { service: 'parcel-routing', component: 'audit' },
});

class AuditLogger {
  logRouting(parcel: ParcelInput, result: RoutingResult): void {
    audit.info({
      event: 'parcel.routed',
      parcelId: result.parcelId,
      input: {
        weight: parcel.weight,
        value: parcel.value,
        destinationCountry: parcel.destination.country,
        destinationCity: parcel.destination.city,
      },
      decision: {
        department: result.department,
        requiresApproval: result.requiresApproval,
        approvalType: result.approvalType || null,
        matchedRuleIds: result.matchedRules.map((r) => r.ruleId),
        matchedRuleNames: result.matchedRules.map((r) => r.ruleName),
      },
      timestamp: result.timestamp,
    }, 'Parcel routing decision recorded');
  }

  logRuleChange(action: 'reload' | 'validation_error', details: Record<string, unknown>): void {
    audit.info({
      event: `rules.${action}`,
      ...details,
      timestamp: new Date().toISOString(),
    }, `Rules ${action}`);
  }

  logBatchCompleted(jobId: string, stats: { total: number; success: number; errors: number }): void {
    audit.info({
      event: 'batch.completed',
      jobId,
      ...stats,
      timestamp: new Date().toISOString(),
    }, 'Batch processing completed');
  }

  logSecurityEvent(event: string, details: Record<string, unknown>): void {
    audit.warn({
      event: `security.${event}`,
      ...details,
      timestamp: new Date().toISOString(),
    }, `Security event: ${event}`);
  }
}

export const auditLogger = new AuditLogger();
