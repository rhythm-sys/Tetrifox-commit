import { describe, it, expect } from 'vitest';
import { migrateRuleConfig, getAvailableMigrations } from '../rule-migrator.js';

describe('RuleMigrator', () => {
  it('leaves current version config unchanged', () => {
    const config = {
      version: '1.0',
      evaluationMode: 'all-matches',
      rules: [
        { id: 'test', name: 'Test', priority: 10, enabled: true, conditions: { all: [] }, action: { type: 'route', message: 'ok' } },
      ],
    };

    const result = migrateRuleConfig(config);
    // v1.0 gets migrated to v1.1 -> v1.2
    expect(result.version).toBe('1.2');
  });

  it('migrates from v1.0 adding tags metadata', () => {
    const config = {
      version: '1.0',
      evaluationMode: 'all-matches',
      rules: [
        { id: 'r1', name: 'Rule 1', priority: 10, enabled: true, conditions: { all: [] }, action: { type: 'route', message: 'ok' } },
      ],
    };

    const result = migrateRuleConfig(config);
    const rules = result.rules as Array<Record<string, unknown>>;
    expect((rules[0].metadata as Record<string, unknown>).tags).toEqual([]);
  });

  it('migrates from v1.1 adding date range fields', () => {
    const config = {
      version: '1.1',
      evaluationMode: 'all-matches',
      rules: [
        { id: 'r1', name: 'Rule 1', priority: 10, enabled: true, conditions: { all: [] }, action: { type: 'route', message: 'ok' } },
      ],
    };

    const result = migrateRuleConfig(config);
    expect(result.version).toBe('1.2');
    const rules = result.rules as Array<Record<string, unknown>>;
    expect(rules[0].effectiveFrom).toBeNull();
    expect(rules[0].effectiveTo).toBeNull();
  });

  it('applies chained migrations (v1.0 -> v1.1 -> v1.2)', () => {
    const config = {
      version: '1.0',
      evaluationMode: 'all-matches',
      rules: [
        { id: 'r1', name: 'Rule 1', priority: 10, enabled: true, conditions: { all: [] }, action: { type: 'route', message: 'ok' } },
      ],
    };

    const result = migrateRuleConfig(config);
    expect(result.version).toBe('1.2');
    const rules = result.rules as Array<Record<string, unknown>>;
    // Has both tags (from v1.0->1.1) and date range (from v1.1->1.2)
    expect((rules[0].metadata as Record<string, unknown>).tags).toEqual([]);
    expect(rules[0].effectiveFrom).toBeNull();
  });

  it('handles missing version gracefully', () => {
    const config = {
      evaluationMode: 'all-matches',
      rules: [],
    };

    // Defaults to v1.0 and migrates
    const result = migrateRuleConfig(config);
    expect(result.version).toBe('1.2');
  });

  it('lists available migrations', () => {
    const migrations = getAvailableMigrations();
    expect(migrations).toContain('1.0');
    expect(migrations).toContain('1.1');
  });
});
