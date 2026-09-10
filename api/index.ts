import type { VercelRequest, VercelResponse } from '@vercel/node';

let handler: any = null;

async function init() {
  process.env.DB_PATH = process.env.DB_PATH || '/tmp/parcel-routing.db';
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
