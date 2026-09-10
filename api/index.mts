import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDatabase } from '../packages/server/src/db/database.js';
import { initParcelService } from '../packages/server/src/services/parcel.service.js';
import { createApp } from '../packages/server/src/app.js';
import type { Express } from 'express';

let app: Express | null = null;

function getApp(): Express {
  if (app) return app;

  // Use /tmp for SQLite in serverless (ephemeral storage)
  process.env.DB_PATH = process.env.DB_PATH || '/tmp/parcel-routing.db';
  process.env.NODE_ENV = 'production';

  initDatabase();
  initParcelService();
  app = createApp();
  return app;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const expressApp = getApp();
  return expressApp(req, res);
}
