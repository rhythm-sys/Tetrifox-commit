import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { initDatabase, closeDatabase } from '../../db/database.js';
import { initParcelService } from '../../services/parcel.service.js';
import path from 'node:path';
import type { Express } from 'express';

let app: Express;

beforeAll(() => {
  // Use in-memory SQLite for tests
  initDatabase(':memory:');

  // Set rules path relative to test location
  process.env.RULES_PATH = path.resolve(import.meta.dirname, '../../../../routing-rules.json');
  initParcelService();

  app = createApp();
});

afterAll(() => {
  closeDatabase();
});

const validParcel = {
  weight: 5,
  value: 100,
  destination: { country: 'DE', city: 'Berlin', postalCode: '10115' },
  sender: { name: 'Test User', address: '123 Test St' },
};

describe('POST /api/parcels/route', () => {
  it('routes a valid parcel successfully', async () => {
    const res = await request(app)
      .post('/api/parcels/route')
      .send(validParcel)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.department).toBe('Regular');
    expect(res.body.data.requiresApproval).toBe(false);
    expect(res.body.data.parcelId).toBeDefined();
  });

  it('routes a light parcel to Mail', async () => {
    const res = await request(app)
      .post('/api/parcels/route')
      .send({ ...validParcel, weight: 0.5 })
      .expect(201);

    expect(res.body.data.department).toBe('Mail');
  });

  it('routes a heavy parcel to Heavy', async () => {
    const res = await request(app)
      .post('/api/parcels/route')
      .send({ ...validParcel, weight: 15 })
      .expect(201);

    expect(res.body.data.department).toBe('Heavy');
  });

  it('flags high-value parcel for insurance approval', async () => {
    const res = await request(app)
      .post('/api/parcels/route')
      .send({ ...validParcel, value: 5000 })
      .expect(201);

    expect(res.body.data.requiresApproval).toBe(true);
    expect(res.body.data.approvalType).toBe('insurance');
  });

  it('rejects invalid parcel (negative weight)', async () => {
    const res = await request(app)
      .post('/api/parcels/route')
      .send({ ...validParcel, weight: -1 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid parcel (missing fields)', async () => {
    const res = await request(app)
      .post('/api/parcels/route')
      .send({ weight: 5 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid country code', async () => {
    const res = await request(app)
      .post('/api/parcels/route')
      .send({
        ...validParcel,
        destination: { country: 'germany', city: 'Berlin', postalCode: '10115' },
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/routing/rules', () => {
  it('returns current routing rules', async () => {
    const res = await request(app)
      .get('/api/routing/rules')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('name');
    expect(res.body.data[0]).toHaveProperty('conditions');
  });
});

describe('GET /api/routing/history', () => {
  it('returns paginated routing history', async () => {
    const res = await request(app)
      .get('/api/routing/history')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
  });

  it('supports filtering by department', async () => {
    const res = await request(app)
      .get('/api/routing/history?department=Regular')
      .expect(200);

    expect(res.body.success).toBe(true);
    for (const entry of res.body.data) {
      expect(entry.department).toBe('Regular');
    }
  });
});

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect(200);

    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/health/ready', () => {
  it('returns healthy when everything is initialized', async () => {
    const res = await request(app)
      .get('/api/health/ready')
      .expect(200);

    expect(res.body.status).toBe('healthy');
    expect(res.body.checks.database).toBe(true);
    expect(res.body.checks.rulesLoaded).toBe(true);
    expect(res.body.checks.engineReady).toBe(true);
  });
});

describe('GET /api/metrics', () => {
  it('returns metrics summary', async () => {
    const res = await request(app)
      .get('/api/metrics')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('routeCounts');
    expect(res.body.data).toHaveProperty('totalProcessed');
    expect(res.body.data).toHaveProperty('uptimeSeconds');
  });
});

describe('POST /api/parcels/batch', () => {
  it('accepts a valid batch file', async () => {
    const batch = [
      validParcel,
      { ...validParcel, weight: 0.5 },
      { ...validParcel, weight: 15, value: 2000 },
    ];

    const res = await request(app)
      .post('/api/parcels/batch')
      .attach('file', Buffer.from(JSON.stringify(batch)), 'test-batch.json')
      .expect(202);

    expect(res.body.success).toBe(true);
    expect(res.body.data.jobId).toBeDefined();

    // Wait briefly for processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check batch status
    const statusRes = await request(app)
      .get(`/api/parcels/batch/${res.body.data.jobId}`)
      .expect(200);

    expect(statusRes.body.data.status).toBe('completed');
    expect(statusRes.body.data.successCount).toBe(3);
  });

  it('rejects request without file', async () => {
    const res = await request(app)
      .post('/api/parcels/batch')
      .expect(400);

    expect(res.body.error.code).toBe('NO_FILE');
  });

  it('returns 404 for unknown batch job', async () => {
    await request(app)
      .get('/api/parcels/batch/nonexistent')
      .expect(404);
  });
});
