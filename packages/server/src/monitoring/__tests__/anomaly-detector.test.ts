import { describe, it, expect, beforeEach } from 'vitest';
import { AnomalyDetector } from '../anomaly-detector.js';
import { metricsCollector } from '../metrics.js';

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector();
    metricsCollector.reset();
  });

  it('returns no anomalies with insufficient data', () => {
    metricsCollector.recordRouting('Mail', 1);
    const anomalies = detector.check();
    expect(anomalies).toHaveLength(0);
  });

  it('detects high error rate', () => {
    // Generate enough snapshots
    for (let i = 0; i < 6; i++) {
      metricsCollector.recordRouting('Mail', 1);
      detector.check();
    }

    // Now create errors
    for (let i = 0; i < 10; i++) {
      metricsCollector.recordError();
    }
    // Only a few successful routings to get high error rate
    metricsCollector.recordRouting('Mail', 1);

    const anomalies = detector.check();
    const errorAnomaly = anomalies.find((a) => a.type === 'high_error_rate');
    expect(errorAnomaly).toBeDefined();
  });

  it('does not flag normal operations', () => {
    // Build up history
    for (let i = 0; i < 10; i++) {
      metricsCollector.recordRouting('Mail', 1);
      metricsCollector.recordRouting('Regular', 2);
      metricsCollector.recordRouting('Heavy', 3);
      detector.check();
    }

    const anomalies = detector.check();
    // No error rate anomalies since we haven't recorded any errors
    const errorAnomaly = anomalies.find((a) => a.type === 'high_error_rate');
    expect(errorAnomaly).toBeUndefined();
  });

  it('tracks snapshots', () => {
    metricsCollector.recordRouting('Mail', 1);
    detector.check();
    expect(detector.getSnapshotCount()).toBe(1);

    metricsCollector.recordRouting('Regular', 2);
    detector.check();
    expect(detector.getSnapshotCount()).toBe(2);
  });
});
