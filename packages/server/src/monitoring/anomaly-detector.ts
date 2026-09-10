import { logger } from '../utils/logger.js';
import { metricsCollector } from './metrics.js';
import type { Anomaly } from '@parcel-routing/shared';

interface Snapshot {
  routeCounts: Record<string, number>;
  totalProcessed: number;
  errorRate: number;
  timestamp: number;
}

export class AnomalyDetector {
  private snapshots: Snapshot[] = [];
  private interval: ReturnType<typeof setInterval> | null = null;
  private readonly maxSnapshots = 288; // 24h at 5min intervals
  private readonly deviationThreshold = 2; // standard deviations
  private readonly errorRateThreshold = 0.05; // 5%
  private readonly latencyThreshold = 500; // ms

  start(intervalMs: number = 5 * 60 * 1000): void {
    this.interval = setInterval(() => this.check(), intervalMs);
    logger.info({ intervalMs }, 'Anomaly detector started');
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  check(): Anomaly[] {
    const metrics = metricsCollector.getMetrics();
    const anomalies: Anomaly[] = [];

    // Take snapshot
    const snapshot: Snapshot = {
      routeCounts: { ...metrics.routeCounts },
      totalProcessed: metrics.totalProcessed,
      errorRate: metrics.errorRate,
      timestamp: Date.now(),
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    // Need at least 6 snapshots (30 min) before detecting anomalies
    if (this.snapshots.length < 6) return anomalies;

    // Check error rate
    if (metrics.errorRate > this.errorRateThreshold) {
      const anomaly: Anomaly = {
        type: 'high_error_rate',
        message: `Error rate ${(metrics.errorRate * 100).toFixed(2)}% exceeds threshold of ${this.errorRateThreshold * 100}%`,
        detectedAt: new Date().toISOString(),
        severity: metrics.errorRate > 0.1 ? 'critical' : 'warning',
      };
      anomalies.push(anomaly);
    }

    // Check latency
    if (metrics.p95LatencyMs > this.latencyThreshold) {
      const anomaly: Anomaly = {
        type: 'high_latency',
        message: `P95 latency ${metrics.p95LatencyMs.toFixed(1)}ms exceeds threshold of ${this.latencyThreshold}ms`,
        detectedAt: new Date().toISOString(),
        severity: metrics.p95LatencyMs > 1000 ? 'critical' : 'warning',
      };
      anomalies.push(anomaly);
    }

    // Check route distribution deviation
    if (metrics.totalProcessed > 0) {
      const routePercentages = this.calculateRoutePercentages(metrics.routeCounts, metrics.totalProcessed);
      const historicalAverages = this.calculateHistoricalAverages();

      for (const [route, currentPct] of Object.entries(routePercentages)) {
        const hist = historicalAverages[route];
        if (!hist) continue;

        const deviation = Math.abs(currentPct - hist.mean) / (hist.stdDev || 1);
        if (deviation > this.deviationThreshold) {
          const anomaly: Anomaly = {
            type: 'route_distribution_shift',
            message: `${route} route at ${(currentPct * 100).toFixed(1)}% (avg: ${(hist.mean * 100).toFixed(1)}%, ${deviation.toFixed(1)} std devs)`,
            detectedAt: new Date().toISOString(),
            severity: deviation > 3 ? 'critical' : 'warning',
          };
          anomalies.push(anomaly);
        }
      }
    }

    // Record anomalies
    for (const anomaly of anomalies) {
      metricsCollector.addAnomaly(anomaly);
      logger.warn({ anomaly }, 'Anomaly detected');
    }

    return anomalies;
  }

  private calculateRoutePercentages(routeCounts: Record<string, number>, total: number): Record<string, number> {
    const pcts: Record<string, number> = {};
    for (const [route, count] of Object.entries(routeCounts)) {
      pcts[route] = count / total;
    }
    return pcts;
  }

  private calculateHistoricalAverages(): Record<string, { mean: number; stdDev: number }> {
    const result: Record<string, { mean: number; stdDev: number }> = {};
    const allRoutes = new Set<string>();

    // Gather all route names
    for (const snap of this.snapshots) {
      for (const route of Object.keys(snap.routeCounts)) {
        allRoutes.add(route);
      }
    }

    for (const route of allRoutes) {
      const values: number[] = [];
      for (const snap of this.snapshots) {
        if (snap.totalProcessed > 0) {
          values.push((snap.routeCounts[route] || 0) / snap.totalProcessed);
        }
      }

      if (values.length === 0) continue;

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
      result[route] = { mean, stdDev: Math.sqrt(variance) };
    }

    return result;
  }

  // For testing
  getSnapshotCount(): number {
    return this.snapshots.length;
  }
}

export const anomalyDetector = new AnomalyDetector();
