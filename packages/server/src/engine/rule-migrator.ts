import { logger } from '../utils/logger.js';

type MigrationFn = (config: Record<string, unknown>) => Record<string, unknown>;

/**
 * Rule schema migration system.
 *
 * When the rule config schema evolves, this migrator automatically upgrades
 * older config files to the current version. Each migration is a pure function
 * that transforms the config from version N to N+1.
 *
 * Example: if we add a "tags" field to rules in v1.1, the migration adds
 * a default empty array for "tags" on each rule that doesn't have it.
 *
 * This prevents breaking changes when operators update the rules file format
 * — old configs keep working, new features get safe defaults.
 */

const migrations: Record<string, MigrationFn> = {
  // v1.0 -> v1.1: Add optional "tags" field to rules and "description" to actions
  '1.0': (config) => {
    const rules = (config.rules as Array<Record<string, unknown>>) || [];
    return {
      ...config,
      version: '1.1',
      rules: rules.map((rule) => ({
        ...rule,
        metadata: {
          ...(rule.metadata as Record<string, unknown> || {}),
          tags: (rule.metadata as Record<string, unknown>)?.tags || [],
        },
      })),
    };
  },

  // v1.1 -> v1.2: Add "effectiveFrom" and "effectiveTo" date range fields
  '1.1': (config) => {
    const rules = (config.rules as Array<Record<string, unknown>>) || [];
    return {
      ...config,
      version: '1.2',
      rules: rules.map((rule) => ({
        ...rule,
        effectiveFrom: (rule as Record<string, unknown>).effectiveFrom || null,
        effectiveTo: (rule as Record<string, unknown>).effectiveTo || null,
      })),
    };
  },
};

const CURRENT_VERSION = '1.0'; // Current expected version

export function migrateRuleConfig(config: Record<string, unknown>): Record<string, unknown> {
  let current = config;
  let version = (current.version as string) || '1.0';
  let migrationCount = 0;
  const maxMigrations = 20; // Safety limit to prevent infinite loops

  while (migrations[version] && migrationCount < maxMigrations) {
    const prevVersion = version;
    current = migrations[version](current);
    version = current.version as string;
    migrationCount++;
    logger.info({ from: prevVersion, to: version }, 'Applied rule config migration');
  }

  if (migrationCount > 0) {
    logger.info({ finalVersion: version, migrationsApplied: migrationCount }, 'Rule config migration complete');
  }

  return current;
}

export function getCurrentSchemaVersion(): string {
  return CURRENT_VERSION;
}

export function getAvailableMigrations(): string[] {
  return Object.keys(migrations);
}
