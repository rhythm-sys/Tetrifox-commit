import type { MetricsSummary, Anomaly } from '@parcel-routing/shared';

class MetricsCollector {
  private routeCounts = new Map<string, number>();
  private latencies: number[] = [];
  private errorCount = 0;
  private totalProcessed = 0;
  private startTime = Date.now();
  private anomalies: Anomaly[] = [];
  private readonly maxLatencyWindow = 1000;

  recordRouting(department: string, latencyMs: number): void {
    this.routeCounts.set(department, (this.routeCounts.get(department) || 0) + 1);
    this.totalProcessed++;
    this.latencies.push(latencyMs);

    // Keep rolling window
    if (this.latencies.length > this.maxLatencyWindow) {
      this.latencies = this.latencies.slice(-this.maxLatencyWindow);
    }
  }

  recordError(): void {
    this.errorCount++;
  }

  addAnomaly(anomaly: Anomaly): void {
    this.anomalies.push(anomaly);
    // Keep last 50 anomalies
    if (this.anomalies.length > 50) {
      this.anomalies = this.anomalies.slice(-50);
    }
  }

  getMetrics(): MetricsSummary {
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const avgLatency = sortedLatencies.length > 0
      ? sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length
      : 0;
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p95Latency = sortedLatencies[p95Index] || 0;

    return {
      routeCounts: Object.fromEntries(this.routeCounts),
      totalProcessed: this.totalProcessed,
      avgLatencyMs: Math.round(avgLatency * 100) / 100,
      p95LatencyMs: Math.round(p95Latency * 100) / 100,
      errorRate: this.totalProcessed > 0
        ? Math.round((this.errorCount / this.totalProcessed) * 10000) / 10000
        : 0,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      anomalies: [...this.anomalies],
    };
  }

  getRouteCounts(): Map<string, number> {
    return new Map(this.routeCounts);
  }

  reset(): void {
    this.routeCounts.clear();
    this.latencies = [];
    this.errorCount = 0;
    this.totalProcessed = 0;
    this.anomalies = [];
    this.startTime = Date.now();
  }
}

export const metricsCollector = new MetricsCollector();
