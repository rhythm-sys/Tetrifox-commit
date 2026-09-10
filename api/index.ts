import type { VercelRequest, VercelResponse } from '@vercel/node';

let handler: any = null;

export default async function (req: VercelRequest, res: VercelResponse) {
  if (!handler) {
    process.env.DB_PATH = process.env.DB_PATH || '/tmp/parcel-routing.db';
    process.env.NODE_ENV = 'production';

    const { initDatabase } = await import('../packages/server/src/db/database.js');
    const { initParcelService } = await import('../packages/server/src/services/parcel.service.js');
    const { createApp } = await import('../packages/server/src/app.js');

    initDatabase();
    initParcelService();
    handler = createApp();
  }
  return handler(req, res);
}
