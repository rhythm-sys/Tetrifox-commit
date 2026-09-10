import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { RuleConfigSchema } from '@parcel-routing/shared';
import type { RuleConfig } from '@parcel-routing/shared';
import { logger } from '../utils/logger.js';
import { auditLogger } from '../utils/audit-logger.js';
import { migrateRuleConfig } from './rule-migrator.js';

export class RuleLoader extends EventEmitter {
  private configPath: string;
  private currentConfig: RuleConfig | null = null;
  private watcher: fs.FSWatcher | null = null;

  constructor(configPath: string) {
    super();
    this.configPath = path.resolve(configPath);
  }

  load(): RuleConfig {
    const raw = fs.readFileSync(this.configPath, 'utf-8');
    const parsed = JSON.parse(raw);

    // Auto-migrate older schema versions before validation
    const migrated = migrateRuleConfig(parsed);
    const validated = RuleConfigSchema.parse(migrated);

    this.currentConfig = validated as RuleConfig;
    logger.info({ version: validated.version, ruleCount: validated.rules.length }, 'Rules loaded');
    return validated as RuleConfig;
  }

  getConfig(): RuleConfig | null {
    return this.currentConfig;
  }

  watch(): void {
    if (this.watcher) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    this.watcher = fs.watch(this.configPath, (eventType) => {
      if (eventType !== 'change') return;

      // Debounce: file systems may fire multiple events for one save
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        try {
          const newConfig = this.load();
          this.emit('rules-updated', newConfig);
          logger.info('Rules hot-reloaded successfully');
          auditLogger.logRuleChange('reload', {
            version: newConfig.version,
            ruleCount: newConfig.rules.length,
            ruleIds: newConfig.rules.map((r) => r.id),
          });
        } catch (error) {
          logger.error({ error }, 'Failed to reload rules — keeping previous configuration');
          auditLogger.logRuleChange('validation_error', { error: String(error) });
          this.emit('rules-error', error);
        }
      }, 200);
    });

    logger.info({ path: this.configPath }, 'Watching rules file for changes');
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
