import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../rule-engine.js';
import type { RuleConfig, ParcelInput } from '@parcel-routing/shared';

// Default routing rules configuration
const defaultConfig: RuleConfig = {
  version: '1.0',
  evaluationMode: 'all-matches',
  rules: [
    {
      id: 'insurance-approval',
      name: 'High Value Insurance Approval',
      priority: 100,
      enabled: true,
      conditions: { all: [{ field: 'value', operator: 'gt', value: 1000 }] },
      action: { type: 'require_approval', approvalType: 'insurance', message: 'Insurance approval required' },
    },
    {
      id: 'heavy-route',
      name: 'Heavy Parcel Route',
      priority: 50,
      enabled: true,
      conditions: { all: [{ field: 'weight', operator: 'gt', value: 10 }] },
      action: { type: 'route', department: 'Heavy', message: 'Routed to Heavy Department' },
    },
    {
      id: 'regular-route',
      name: 'Regular Parcel Route',
      priority: 40,
      enabled: true,
      conditions: {
        all: [
          { field: 'weight', operator: 'gt', value: 1 },
          { field: 'weight', operator: 'lte', value: 10 },
        ],
      },
      action: { type: 'route', department: 'Regular', message: 'Routed to Regular Department' },
    },
    {
      id: 'mail-route',
      name: 'Mail Route',
      priority: 30,
      enabled: true,
      conditions: { all: [{ field: 'weight', operator: 'lte', value: 1 }] },
      action: { type: 'route', department: 'Mail', message: 'Routed to Mail Department' },
    },
  ],
};

function makeParcel(overrides: Partial<ParcelInput> = {}): ParcelInput {
  return {
    weight: 5,
    value: 100,
    destination: { country: 'DE', city: 'Berlin', postalCode: '10115' },
    sender: { name: 'Test User', address: '123 Test St' },
    ...overrides,
  };
}

describe('RuleEngine', () => {
  describe('default routing rules', () => {
    const engine = new RuleEngine(defaultConfig);

    it('routes a 0.5kg parcel to Mail', () => {
      const result = engine.evaluate(makeParcel({ weight: 0.5 }));
      expect(result.department).toBe('Mail');
      expect(result.requiresApproval).toBe(false);
    });

    it('routes a 1kg parcel to Mail (boundary)', () => {
      const result = engine.evaluate(makeParcel({ weight: 1 }));
      expect(result.department).toBe('Mail');
      expect(result.requiresApproval).toBe(false);
    });

    it('routes a 1.1kg parcel to Regular', () => {
      const result = engine.evaluate(makeParcel({ weight: 1.1 }));
      expect(result.department).toBe('Regular');
      expect(result.requiresApproval).toBe(false);
    });

    it('routes a 5kg parcel to Regular', () => {
      const result = engine.evaluate(makeParcel({ weight: 5 }));
      expect(result.department).toBe('Regular');
      expect(result.requiresApproval).toBe(false);
    });

    it('routes a 10kg parcel to Regular (boundary)', () => {
      const result = engine.evaluate(makeParcel({ weight: 10 }));
      expect(result.department).toBe('Regular');
      expect(result.requiresApproval).toBe(false);
    });

    it('routes a 10.1kg parcel to Heavy', () => {
      const result = engine.evaluate(makeParcel({ weight: 10.1 }));
      expect(result.department).toBe('Heavy');
      expect(result.requiresApproval).toBe(false);
    });

    it('routes a 50kg parcel to Heavy', () => {
      const result = engine.evaluate(makeParcel({ weight: 50 }));
      expect(result.department).toBe('Heavy');
      expect(result.requiresApproval).toBe(false);
    });
  });

  describe('insurance approval', () => {
    const engine = new RuleEngine(defaultConfig);

    it('flags a high-value parcel for insurance approval', () => {
      const result = engine.evaluate(makeParcel({ value: 1500, weight: 0.5 }));
      expect(result.requiresApproval).toBe(true);
      expect(result.approvalType).toBe('insurance');
    });

    it('does not flag a low-value parcel', () => {
      const result = engine.evaluate(makeParcel({ value: 500 }));
      expect(result.requiresApproval).toBe(false);
    });

    it('flags €1000 boundary as not requiring approval (gt not gte)', () => {
      const result = engine.evaluate(makeParcel({ value: 1000 }));
      expect(result.requiresApproval).toBe(false);
    });

    it('flags €1001 for approval', () => {
      const result = engine.evaluate(makeParcel({ value: 1001 }));
      expect(result.requiresApproval).toBe(true);
    });
  });

  describe('all-matches mode: insurance + routing combined', () => {
    const engine = new RuleEngine(defaultConfig);

    it('a heavy, high-value parcel gets both insurance flag and Heavy route', () => {
      const result = engine.evaluate(makeParcel({ weight: 15, value: 2000 }));
      expect(result.requiresApproval).toBe(true);
      expect(result.department).toBe('Heavy');
      expect(result.matchedRules).toHaveLength(2);
      expect(result.matchedRules[0].ruleId).toBe('insurance-approval');
      expect(result.matchedRules[1].ruleId).toBe('heavy-route');
    });

    it('a light, high-value parcel gets insurance flag and Mail route', () => {
      const result = engine.evaluate(makeParcel({ weight: 0.5, value: 5000 }));
      expect(result.requiresApproval).toBe(true);
      expect(result.department).toBe('Mail');
    });
  });

  describe('first-match mode', () => {
    it('stops at the first matching rule', () => {
      const firstMatchConfig: RuleConfig = {
        ...defaultConfig,
        evaluationMode: 'first-match',
      };
      const engine = new RuleEngine(firstMatchConfig);

      // A high-value heavy parcel: insurance rule has priority 100, fires first
      const result = engine.evaluate(makeParcel({ weight: 15, value: 2000 }));
      expect(result.matchedRules).toHaveLength(1);
      expect(result.matchedRules[0].ruleId).toBe('insurance-approval');
      // In first-match mode, the heavy route doesn't fire
      expect(result.department).toBeNull();
      expect(result.requiresApproval).toBe(true);
    });
  });

  describe('disabled rules', () => {
    it('skips disabled rules', () => {
      const config: RuleConfig = {
        ...defaultConfig,
        rules: defaultConfig.rules.map((r) =>
          r.id === 'insurance-approval' ? { ...r, enabled: false } : r
        ),
      };
      const engine = new RuleEngine(config);

      const result = engine.evaluate(makeParcel({ weight: 15, value: 2000 }));
      expect(result.requiresApproval).toBe(false);
      expect(result.department).toBe('Heavy');
    });
  });

  describe('priority ordering', () => {
    it('evaluates rules in descending priority order', () => {
      const engine = new RuleEngine(defaultConfig);
      const rules = engine.getRules();
      for (let i = 1; i < rules.length; i++) {
        expect(rules[i - 1].priority).toBeGreaterThanOrEqual(rules[i].priority);
      }
    });
  });

  describe('result shape', () => {
    it('returns a well-formed RoutingResult', () => {
      const engine = new RuleEngine(defaultConfig);
      const result = engine.evaluate(makeParcel());
      expect(result.parcelId).toBeDefined();
      expect(typeof result.parcelId).toBe('string');
      expect(result.timestamp).toBeDefined();
      expect(result.matchedRules).toBeInstanceOf(Array);
    });
  });

  describe('no matching rules', () => {
    it('returns null department when no rules match', () => {
      const config: RuleConfig = {
        version: '1.0',
        evaluationMode: 'all-matches',
        rules: [
          {
            id: 'impossible',
            name: 'Impossible Rule',
            priority: 10,
            enabled: true,
            conditions: { all: [{ field: 'weight', operator: 'gt', value: 999999 }] },
            action: { type: 'route', department: 'Nowhere', message: 'Should not match' },
          },
        ],
      };
      const engine = new RuleEngine(config);
      const result = engine.evaluate(makeParcel());
      expect(result.department).toBeNull();
      expect(result.matchedRules).toHaveLength(0);
    });
  });

  describe('regression protection: adding a new rule preserves existing routing', () => {
    // Golden test parcels with known expected routes
    const goldenParcels = [
      { input: makeParcel({ weight: 0.5, value: 100 }), expectedDept: 'Mail', expectedApproval: false },
      { input: makeParcel({ weight: 5, value: 500 }), expectedDept: 'Regular', expectedApproval: false },
      { input: makeParcel({ weight: 15, value: 200 }), expectedDept: 'Heavy', expectedApproval: false },
      { input: makeParcel({ weight: 0.3, value: 5000 }), expectedDept: 'Mail', expectedApproval: true },
      { input: makeParcel({ weight: 50, value: 2000 }), expectedDept: 'Heavy', expectedApproval: true },
    ];

    it('existing parcels route identically after adding a new rule', () => {
      // Baseline
      const baselineEngine = new RuleEngine(defaultConfig);
      const baselineResults = goldenParcels.map(({ input }) => baselineEngine.evaluate(input));

      // Add a new rule: Express route for parcels to NL under 2kg
      const extendedConfig: RuleConfig = {
        ...defaultConfig,
        rules: [
          ...defaultConfig.rules,
          {
            id: 'express-nl',
            name: 'Express NL Route',
            priority: 45,
            enabled: true,
            conditions: {
              all: [
                { field: 'destination.country', operator: 'eq', value: 'NL' },
                { field: 'weight', operator: 'lte', value: 2 },
              ],
            },
            action: { type: 'route', department: 'Express NL', message: 'Express route for NL parcels ≤ 2kg' },
          },
        ],
      };
      const extendedEngine = new RuleEngine(extendedConfig);

      // All golden parcels (none go to NL) should route identically
      goldenParcels.forEach(({ input, expectedDept, expectedApproval }, i) => {
        const result = extendedEngine.evaluate(input);
        expect(result.department).toBe(expectedDept);
        expect(result.requiresApproval).toBe(expectedApproval);
        expect(result.department).toBe(baselineResults[i].department);
      });

      // The new rule should correctly route an NL parcel
      const nlParcel = makeParcel({ weight: 1.5, value: 50, destination: { country: 'NL', city: 'Amsterdam', postalCode: '1012' } });
      const nlResult = extendedEngine.evaluate(nlParcel);
      expect(nlResult.department).toBe('Express NL');
    });
  });

  describe('country-based routing rule', () => {
    it('routes based on destination country using in operator', () => {
      const config: RuleConfig = {
        version: '1.0',
        evaluationMode: 'all-matches',
        rules: [
          {
            id: 'eu-express',
            name: 'EU Express',
            priority: 60,
            enabled: true,
            conditions: {
              all: [
                { field: 'destination.country', operator: 'in', value: ['DE', 'NL', 'FR', 'BE'] },
                { field: 'weight', operator: 'lte', value: 5 },
              ],
            },
            action: { type: 'route', department: 'EU Express', message: 'EU express delivery' },
          },
          ...defaultConfig.rules,
        ],
      };
      const engine = new RuleEngine(config);

      const deParcel = makeParcel({ weight: 3, destination: { country: 'DE', city: 'Berlin', postalCode: '10115' } });
      expect(engine.evaluate(deParcel).department).toBe('EU Express');

      const usParcel = makeParcel({ weight: 3, destination: { country: 'US', city: 'NYC', postalCode: '10001' } });
      expect(engine.evaluate(usParcel).department).toBe('Regular');
    });
  });
});
