/**
 * k6 Load Test for Parcel Routing System
 *
 * Install k6: brew install k6
 * Run: k6 run load-tests/routing-load-test.js
 *
 * Scenarios:
 * 1. smoke     - 1 VU, 30s — baseline sanity check
 * 2. load      - ramp to 50 VUs over 2m, sustain 3m — normal traffic
 * 3. stress    - ramp to 200 VUs over 5m — find breaking point
 * 4. spike     - jump to 100 VUs for 30s — sudden traffic burst
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// Custom metrics
const routingLatency = new Trend('routing_latency', true);
const errorRate = new Rate('routing_errors');

// Test scenarios
export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { scenario: 'smoke' },
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '2m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      startTime: '35s',
      tags: { scenario: 'load' },
    },
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '30s', target: 100 },
        { duration: '10s', target: 0 },
      ],
      startTime: '7m',
      tags: { scenario: 'spike' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    routing_errors: ['rate<0.01'],          // < 1% error rate
    routing_latency: ['p(95)<100'],          // Routing decision < 100ms at p95
    http_req_failed: ['rate<0.01'],
  },
};

// Sample parcel data with weighted distribution
const parcels = [
  // Mail (30%)
  { weight: 0.2, value: 15, destination: { country: 'DE', city: 'Berlin', postalCode: '10115' }, sender: { name: 'User', address: 'Street 1' } },
  { weight: 0.5, value: 30, destination: { country: 'NL', city: 'Amsterdam', postalCode: '1012' }, sender: { name: 'User', address: 'Street 2' } },
  { weight: 0.8, value: 50, destination: { country: 'FR', city: 'Paris', postalCode: '75001' }, sender: { name: 'User', address: 'Street 3' } },
  // Regular (40%)
  { weight: 2.5, value: 120, destination: { country: 'DE', city: 'Munich', postalCode: '80331' }, sender: { name: 'User', address: 'Street 4' } },
  { weight: 5.0, value: 250, destination: { country: 'BE', city: 'Brussels', postalCode: '1000' }, sender: { name: 'User', address: 'Street 5' } },
  { weight: 8.0, value: 400, destination: { country: 'NL', city: 'Rotterdam', postalCode: '3011' }, sender: { name: 'User', address: 'Street 6' } },
  { weight: 10.0, value: 150, destination: { country: 'FR', city: 'Lyon', postalCode: '69001' }, sender: { name: 'User', address: 'Street 7' } },
  // Heavy (20%)
  { weight: 15.0, value: 800, destination: { country: 'DE', city: 'Hamburg', postalCode: '20095' }, sender: { name: 'User', address: 'Street 8' } },
  { weight: 30.0, value: 300, destination: { country: 'BE', city: 'Antwerp', postalCode: '2000' }, sender: { name: 'User', address: 'Street 9' } },
  // High value — insurance required (10%)
  { weight: 0.3, value: 5000, destination: { country: 'NL', city: 'Amsterdam', postalCode: '1012' }, sender: { name: 'User', address: 'Street 10' } },
];

function randomParcel() {
  return parcels[Math.floor(Math.random() * parcels.length)];
}

export default function () {
  // 80% single parcel routing, 15% history queries, 5% health checks
  const roll = Math.random();

  if (roll < 0.80) {
    // Route a single parcel
    const parcel = randomParcel();
    const res = http.post(`${BASE_URL}/api/parcels/route`, JSON.stringify(parcel), {
      headers: { 'Content-Type': 'application/json' },
    });

    const success = check(res, {
      'routing returns 201': (r) => r.status === 201,
      'response has department': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.data.department !== undefined;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
    routingLatency.add(res.timings.duration);

  } else if (roll < 0.95) {
    // Query routing history
    const res = http.get(`${BASE_URL}/api/routing/history?page=1&pageSize=10`);
    check(res, {
      'history returns 200': (r) => r.status === 200,
    });

  } else {
    // Health check
    const res = http.get(`${BASE_URL}/api/health/ready`);
    check(res, {
      'health returns 200': (r) => r.status === 200,
      'system is healthy': (r) => {
        try {
          return JSON.parse(r.body).status === 'healthy';
        } catch {
          return false;
        }
      },
    });
  }

  sleep(0.1 + Math.random() * 0.4); // 100-500ms think time
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99 = data.metrics.http_req_duration?.values?.['p(99)'] || 0;
  const totalReqs = data.metrics.http_reqs?.values?.count || 0;
  const errRate = data.metrics.routing_errors?.values?.rate || 0;

  console.log('\n=== Load Test Summary ===');
  console.log(`Total Requests: ${totalReqs}`);
  console.log(`P95 Latency:    ${p95.toFixed(1)}ms`);
  console.log(`P99 Latency:    ${p99.toFixed(1)}ms`);
  console.log(`Error Rate:     ${(errRate * 100).toFixed(2)}%`);
  console.log('========================\n');

  return {};
}
