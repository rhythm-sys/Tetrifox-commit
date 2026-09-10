import type { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../config/app.config.js';

export function applySecurityMiddleware(app: Express): void {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", ...config.cors.origins],
      },
    },
  }));

  // CORS
  app.use(cors({
    origin: config.cors.origins,
    methods: ['GET', 'POST'],
    credentials: true,
    maxAge: 86400,
  }));

  // General rate limiter
  app.use('/api/', rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
  }));

  // Stricter rate limiter for batch uploads
  app.use('/api/parcels/batch', rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Batch upload rate limit exceeded.' } },
  }));
}
