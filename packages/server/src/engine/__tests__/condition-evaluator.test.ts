import { describe, it, expect } from 'vitest';
import { evaluateConditions } from '../condition-evaluator.js';
import type { ConditionGroup } from '@parcel-routing/shared';

const parcel = {
  weight: 5,
  value: 1500,
  destination: { country: 'DE', city: 'Berlin', postalCode: '10115' },
  'destination.country': 'DE',
  'destination.city': 'Berlin',
  'destination.postalCode': '10115',
  description: 'Electronics',
};

describe('ConditionEvaluator', () => {
  describe('all (AND) conditions', () => {
    it('returns true when all conditions match', () => {
      const group: ConditionGroup = {
        all: [
          { field: 'weight', operator: 'gt', value: 1 },
          { field: 'weight', operator: 'lte', value: 10 },
        ],
      };
      expect(evaluateConditions(group, parcel)).toBe(true);
    });

    it('returns false when any condition fails', () => {
      const group: ConditionGroup = {
        all: [
          { field: 'weight', operator: 'gt', value: 1 },
          { field: 'weight', operator: 'gt', value: 10 },
        ],
      };
      expect(evaluateConditions(group, parcel)).toBe(false);
    });
  });

  describe('any (OR) conditions', () => {
    it('returns true when any condition matches', () => {
      const group: ConditionGroup = {
        any: [
          { field: 'weight', operator: 'gt', value: 100 },
          { field: 'value', operator: 'gt', value: 1000 },
        ],
      };
      expect(evaluateConditions(group, parcel)).toBe(true);
    });

    it('returns false when no conditions match', () => {
      const group: ConditionGroup = {
        any: [
          { field: 'weight', operator: 'gt', value: 100 },
          { field: 'value', operator: 'lt', value: 100 },
        ],
      };
      expect(evaluateConditions(group, parcel)).toBe(false);
    });
  });

  describe('nested conditions', () => {
    it('handles nested all inside any', () => {
      const group: ConditionGroup = {
        any: [
          {
            all: [
              { field: 'weight', operator: 'gt', value: 100 },
              { field: 'value', operator: 'gt', value: 100 },
            ],
          },
          {
            all: [
              { field: 'destination.country', operator: 'eq', value: 'DE' },
              { field: 'value', operator: 'gt', value: 1000 },
            ],
          },
        ],
      };
      // First branch fails (weight not > 100), second branch succeeds (DE + value > 1000)
      expect(evaluateConditions(group, parcel)).toBe(true);
    });
  });

  describe('dot-notation field access', () => {
    it('resolves nested fields', () => {
      const group: ConditionGroup = {
        all: [{ field: 'destination.country', operator: 'eq', value: 'DE' }],
      };
      expect(evaluateConditions(group, parcel)).toBe(true);
    });
  });

  describe('missing fields', () => {
    it('handles missing field gracefully (returns undefined)', () => {
      const group: ConditionGroup = {
        all: [{ field: 'nonexistent', operator: 'eq', value: undefined }],
      };
      expect(evaluateConditions(group, parcel)).toBe(true); // undefined === undefined
    });
  });

  describe('empty condition group', () => {
    it('returns false for empty group with no all/any', () => {
      const group: ConditionGroup = {};
      expect(evaluateConditions(group, parcel)).toBe(false);
    });
  });

  describe('max recursion depth', () => {
    it('throws when nesting exceeds maximum depth', () => {
      // Build a deeply nested condition (depth > 10)
      let group: ConditionGroup = { all: [{ field: 'weight', operator: 'gt', value: 0 }] };
      for (let i = 0; i < 12; i++) {
        group = { all: [group] };
      }
      expect(() => evaluateConditions(group, parcel)).toThrow('maximum depth');
    });
  });

  describe('in operator with countries', () => {
    it('matches country in EU list', () => {
      const group: ConditionGroup = {
        all: [{ field: 'destination.country', operator: 'in', value: ['DE', 'NL', 'FR', 'BE'] }],
      };
      expect(evaluateConditions(group, parcel)).toBe(true);
    });

    it('does not match country outside list', () => {
      const group: ConditionGroup = {
        all: [{ field: 'destination.country', operator: 'in', value: ['US', 'CA'] }],
      };
      expect(evaluateConditions(group, parcel)).toBe(false);
    });
  });
});
