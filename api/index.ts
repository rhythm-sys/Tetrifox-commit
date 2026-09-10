import type { VercelRequest, VercelResponse } from '@vercel/node';
import { writeFileSync, mkdirSync } from 'fs';

let handler: any = null;

// Embedded routing rules — avoids file resolution issues in serverless
const ROUTING_RULES = {
  version: '1.0',
  evaluationMode: 'first-match',
  rules: [
    {
      id: 'insurance-approval',
      name: 'High Value Insurance Approval',
      description: 'Parcels with declared value over €1,000 require insurance approval before routing',
      priority: 100,
      enabled: true,
      conditions: { all: [{ field: 'value', operator: 'gt', value: 1000 }] },
      action: {
        type: 'require_approval',
        approvalType: 'insurance',
        message: 'Parcel value exceeds €1,000. Insurance approval required before routing.',
      },
    },
    {
      id: 'heavy-route',
      name: 'Heavy Parcel Route',
      description: 'Parcels over 10kg are routed to the Heavy Department',
      priority: 50,
      enabled: true,
      conditions: { all: [{ field: 'weight', operator: 'gt', value: 10 }] },
      action: { type: 'route', department: 'Heavy', message: 'Routed to Heavy Department (weight > 10kg)' },
    },
    {
      id: 'regular-route',
      name: 'Regular Parcel Route',
      description: 'Parcels between 1kg and 10kg are routed to the Regular Department',
      priority: 40,
      enabled: true,
      conditions: {
        all: [
          { field: 'weight', operator: 'gt', value: 1 },
          { field: 'weight', operator: 'lte', value: 10 },
        ],
      },
      action: { type: 'route', department: 'Regular', message: 'Routed to Regular Department (1kg < weight ≤ 10kg)' },
    },
    {
      id: 'mail-route',
      name: 'Mail Route',
      description: 'Parcels up to 1kg are routed to the Mail Department',
      priority: 30,
      enabled: true,
      conditions: { all: [{ field: 'weight', operator: 'lte', value: 1 }] },
      action: { type: 'route', department: 'Mail', message: 'Routed to Mail Department (weight ≤ 1kg)' },
    },
  ],
};

// Migration SQL — embedded to avoid file path issues in serverless
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS routing_history (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  parcel_id       TEXT NOT NULL UNIQUE,
  weight          REAL NOT NULL,
  value           REAL NOT NULL,
  destination     TEXT NOT NULL,
  description     TEXT,
  department      TEXT,
  requires_approval INTEGER NOT NULL DEFAULT 0,
  matched_rules   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'completed',
  batch_id        TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_routing_history_status ON routing_history(status);
CREATE INDEX IF NOT EXISTS idx_routing_history_department ON routing_history(department);
CREATE INDEX IF NOT EXISTS idx_routing_history_batch_id ON routing_history(batch_id);
CREATE INDEX IF NOT EXISTS idx_routing_history_created_at ON routing_history(created_at);

CREATE TABLE IF NOT EXISTS batch_jobs (
  id              TEXT PRIMARY KEY,
  filename        TEXT NOT NULL,
  content_hash    TEXT,
  total_count     INTEGER NOT NULL DEFAULT 0,
  processed       INTEGER NOT NULL DEFAULT 0,
  success_count   INTEGER NOT NULL DEFAULT 0,
  error_count     INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'processing',
  errors          TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    DATETIME
);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_content_hash ON batch_jobs(content_hash);
`;

async function init() {
  // Write files to /tmp — guaranteed writable in serverless
  writeFileSync('/tmp/routing-rules.json', JSON.stringify(ROUTING_RULES, null, 2));
  mkdirSync('/tmp/migrations', { recursive: true });
  writeFileSync('/tmp/migrations/001_initial.sql', MIGRATION_SQL);

  // Set env BEFORE importing server modules (config reads env at import time)
  process.env.DB_PATH = '/tmp/parcel-routing.db';
  process.env.RULES_PATH = '/tmp/routing-rules.json';
  process.env.NODE_ENV = 'production';

  const { initDatabase } = await import('../packages/server/src/db/database.js');
  const { initParcelService } = await import('../packages/server/src/services/parcel.service.js');
  const { createApp } = await import('../packages/server/src/app.js');

  initDatabase();
  initParcelService();
  handler = createApp();
}

export default async function (req: VercelRequest, res: VercelResponse) {
  try {
    if (!handler) {
      await init();
    }
    return handler(req, res);
  } catch (error: any) {
    console.error('Serverless function error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message, stack: error.stack },
    });
  }
}
