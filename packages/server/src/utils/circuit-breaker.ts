import { logger } from './logger.js';

export type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
  name: string;
  failureThreshold: number;   // failures before opening
  resetTimeoutMs: number;     // time in open state before half-open
  halfOpenMaxAttempts: number; // successes needed to close from half-open
}

/**
 * Circuit Breaker pattern implementation.
 *
 * States:
 * - CLOSED: normal operation, requests pass through
 * - OPEN: failures exceeded threshold, requests fail fast without hitting the resource
 * - HALF-OPEN: after reset timeout, allow limited requests to test if resource recovered
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(options: CircuitBreakerOptions) {
    this.options = options;
  }

  async execute<T>(operation: () => T | Promise<T>, fallback?: () => T): Promise<T> {
    if (this.state === 'open') {
      // Check if reset timeout has elapsed
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs) {
        this.transitionTo('half-open');
      } else {
        logger.warn({ circuit: this.options.name }, 'Circuit breaker OPEN — fast-failing');
        if (fallback) return fallback();
        throw new Error(`Circuit breaker "${this.options.name}" is open`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) return fallback();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.options.halfOpenMaxAttempts) {
        this.transitionTo('closed');
      }
    }
    // In closed state, reset failure count on success
    if (this.state === 'closed') {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      // Any failure in half-open goes back to open
      this.transitionTo('open');
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.transitionTo('open');
    }
  }

  private transitionTo(newState: CircuitState): void {
    const prevState = this.state;
    this.state = newState;

    if (newState === 'closed') {
      this.failureCount = 0;
      this.successCount = 0;
    } else if (newState === 'half-open') {
      this.successCount = 0;
    }

    logger.info({ circuit: this.options.name, from: prevState, to: newState }, 'Circuit breaker state transition');
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      name: this.options.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
    };
  }

  // For testing
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}
