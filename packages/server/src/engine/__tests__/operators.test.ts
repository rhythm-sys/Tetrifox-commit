import { describe, it, expect } from 'vitest';
import { getOperator, registerOperator, getAvailableOperators } from '../operators.js';

describe('Operators', () => {
  describe('eq', () => {
    const op = getOperator('eq')!;
    it('returns true for equal values', () => expect(op(5, 5)).toBe(true));
    it('returns false for different values', () => expect(op(5, 10)).toBe(false));
    it('handles string equality', () => expect(op('DE', 'DE')).toBe(true));
    it('is strict (no type coercion)', () => expect(op(5, '5')).toBe(false));
  });

  describe('neq', () => {
    const op = getOperator('neq')!;
    it('returns true for different values', () => expect(op(5, 10)).toBe(true));
    it('returns false for equal values', () => expect(op(5, 5)).toBe(false));
  });

  describe('gt', () => {
    const op = getOperator('gt')!;
    it('returns true when a > b', () => expect(op(15, 10)).toBe(true));
    it('returns false when a === b', () => expect(op(10, 10)).toBe(false));
    it('returns false when a < b', () => expect(op(5, 10)).toBe(false));
    it('handles numeric strings', () => expect(op('15', 10)).toBe(true));
  });

  describe('gte', () => {
    const op = getOperator('gte')!;
    it('returns true when a > b', () => expect(op(15, 10)).toBe(true));
    it('returns true when a === b', () => expect(op(10, 10)).toBe(true));
    it('returns false when a < b', () => expect(op(5, 10)).toBe(false));
  });

  describe('lt', () => {
    const op = getOperator('lt')!;
    it('returns true when a < b', () => expect(op(5, 10)).toBe(true));
    it('returns false when a === b', () => expect(op(10, 10)).toBe(false));
  });

  describe('lte', () => {
    const op = getOperator('lte')!;
    it('returns true when a < b', () => expect(op(5, 10)).toBe(true));
    it('returns true when a === b', () => expect(op(10, 10)).toBe(true));
    it('returns false when a > b', () => expect(op(15, 10)).toBe(false));
  });

  describe('in', () => {
    const op = getOperator('in')!;
    it('returns true when value is in array', () => expect(op('DE', ['DE', 'NL', 'FR'])).toBe(true));
    it('returns false when value is not in array', () => expect(op('US', ['DE', 'NL'])).toBe(false));
    it('returns false when b is not an array', () => expect(op('DE', 'DE')).toBe(false));
  });

  describe('nin', () => {
    const op = getOperator('nin')!;
    it('returns true when value is not in array', () => expect(op('US', ['DE', 'NL'])).toBe(true));
    it('returns false when value is in array', () => expect(op('DE', ['DE', 'NL'])).toBe(false));
    it('returns true when b is not an array', () => expect(op('DE', 'DE')).toBe(true));
  });

  describe('regex', () => {
    const op = getOperator('regex')!;
    it('matches a pattern', () => expect(op('hello world', 'hello')).toBe(true));
    it('does not match non-matching pattern', () => expect(op('hello', '^world')).toBe(false));
    it('handles invalid regex gracefully', () => expect(op('test', '[')).toBe(false));
    it('returns false when b is not a string', () => expect(op('test', 123)).toBe(false));
  });

  describe('between', () => {
    const op = getOperator('between')!;
    it('returns true when value is in range', () => expect(op(5, [1, 10])).toBe(true));
    it('returns true at lower bound', () => expect(op(1, [1, 10])).toBe(true));
    it('returns true at upper bound', () => expect(op(10, [1, 10])).toBe(true));
    it('returns false outside range', () => expect(op(15, [1, 10])).toBe(false));
    it('returns false when b is not a 2-element array', () => expect(op(5, [1])).toBe(false));
  });

  describe('custom operators', () => {
    it('can register and use a custom operator', () => {
      registerOperator('startsWith', (a, b) => String(a).startsWith(String(b)));
      const op = getOperator('startsWith')!;
      expect(op('hello', 'hel')).toBe(true);
      expect(op('hello', 'world')).toBe(false);
    });
  });

  describe('getAvailableOperators', () => {
    it('returns all registered operator names', () => {
      const ops = getAvailableOperators();
      expect(ops).toContain('eq');
      expect(ops).toContain('gt');
      expect(ops).toContain('between');
    });
  });
});
