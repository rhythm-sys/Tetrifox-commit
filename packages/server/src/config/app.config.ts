export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || './data/parcel-routing.db',
  rulesPath: process.env.RULES_PATH || '../../routing-rules.json',
  cors: {
    origins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  },
  batch: {
    maxFileSizeMB: parseInt(process.env.BATCH_MAX_SIZE_MB || '50'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
} as const;
