import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker } from '../circuit-breaker.js';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker({
      name: 'test',
      failureThreshold: 3,
      resetTimeoutMs: 100, // Short for testing
      halfOpenMaxAttempts: 2,
    });
  });

  it('starts in closed state', () => {
    expect(cb.getState()).toBe('closed');
  });

  it('stays closed on success', async () => {
    await cb.execute(() => 'ok');
    expect(cb.getState()).toBe('closed');
  });

  it('opens after failure threshold', async () => {
    const failing = () => { throw new Error('fail'); };

    for (let i = 0; i < 3; i++) {
      await cb.execute(failing, () => 'fallback');
    }

    expect(cb.getState()).toBe('open');
  });

  it('uses fallback when open', async () => {
    // Force open
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => { throw new Error('fail'); }, () => 'fallback');
    }

    const result = await cb.execute(() => 'should not run', () => 'fallback-value');
    expect(result).toBe('fallback-value');
  });

  it('throws when open and no fallback', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => { throw new Error('fail'); }, () => 'fb');
    }

    await expect(cb.execute(() => 'nope')).rejects.toThrow('Circuit breaker');
  });

  it('transitions to half-open after timeout', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => { throw new Error('fail'); }, () => 'fb');
    }

    expect(cb.getState()).toBe('open');

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 150));

    await cb.execute(() => 'ok');
    expect(cb.getState()).toBe('half-open');
  });

  it('closes after enough successes in half-open', async () => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => { throw new Error('fail'); }, () => 'fb');
    }

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Half-open: need 2 successes
    await cb.execute(() => 'ok1');
    expect(cb.getState()).toBe('half-open');

    await cb.execute(() => 'ok2');
    expect(cb.getState()).toBe('closed');
  });

  it('re-opens on failure in half-open', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => { throw new Error('fail'); }, () => 'fb');
    }

    await new Promise((resolve) => setTimeout(resolve, 150));

    // One success then a failure
    await cb.execute(() => 'ok');
    expect(cb.getState()).toBe('half-open');

    await cb.execute(() => { throw new Error('fail again'); }, () => 'fb');
    expect(cb.getState()).toBe('open');
  });

  it('reports stats correctly', async () => {
    await cb.execute(() => 'ok');
    const stats = cb.getStats();
    expect(stats.name).toBe('test');
    expect(stats.state).toBe('closed');
    expect(stats.failureCount).toBe(0);
  });

  it('resets cleanly', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => { throw new Error('fail'); }, () => 'fb');
    }
    expect(cb.getState()).toBe('open');

    cb.reset();
    expect(cb.getState()).toBe('closed');
    expect(cb.getStats().failureCount).toBe(0);
  });
});
