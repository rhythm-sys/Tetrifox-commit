import { getDatabase } from '../database.js';
import type { RoutingResult, ParcelInput, RoutingHistoryEntry } from '@parcel-routing/shared';
import { logger } from '../../utils/logger.js';

interface QueryOptions {
  page: number;
  pageSize: number;
  department?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface PaginatedResult {
  data: RoutingHistoryEntry[];
  totalCount: number;
}

export function insertRoutingRecord(
  parcel: ParcelInput,
  result: RoutingResult,
  batchId?: string
): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO routing_history (parcel_id, weight, value, destination, description, department, requires_approval, matched_rules, status, batch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const status = result.requiresApproval ? 'pending_approval' : 'completed';

  stmt.run(
    result.parcelId,
    parcel.weight,
    parcel.value,
    JSON.stringify(parcel.destination),
    parcel.description || null,
    result.department,
    result.requiresApproval ? 1 : 0,
    JSON.stringify(result.matchedRules.map((r) => r.ruleId)),
    status,
    batchId || null
  );
}

// Map camelCase query params to snake_case DB columns
const SORT_COLUMN_MAP: Record<string, string> = {
  createdAt: 'created_at',
  created_at: 'created_at',
  weight: 'weight',
  value: 'value',
  department: 'department',
};

export function queryRoutingHistory(options: QueryOptions): PaginatedResult {
  const db = getDatabase();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.department) {
    conditions.push('department = ?');
    params.push(options.department);
  }
  if (options.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }
  if (options.dateFrom) {
    conditions.push('created_at >= ?');
    params.push(options.dateFrom);
  }
  if (options.dateTo) {
    conditions.push('created_at <= ?');
    params.push(options.dateTo);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Map and validate sort column to prevent SQL injection
  const sortColumn = SORT_COLUMN_MAP[options.sortBy] || 'created_at';
  const sortOrder = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countResult = db.prepare(`SELECT COUNT(*) as count FROM routing_history ${whereClause}`).get(...params) as { count: number };

  const offset = (options.page - 1) * options.pageSize;
  const rows = db.prepare(
    `SELECT * FROM routing_history ${whereClause} ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`
  ).all(...params, options.pageSize, offset) as Array<Record<string, unknown>>;

  return {
    data: rows.map(mapRow),
    totalCount: countResult.count,
  };
}

export function getRecentHistory(limit: number = 10): RoutingHistoryEntry[] {
  const db = getDatabase();
  const rows = db.prepare(
    'SELECT * FROM routing_history ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as Array<Record<string, unknown>>;
  return rows.map(mapRow);
}

export function getRouteCounts(): Record<string, number> {
  const db = getDatabase();
  const rows = db.prepare(
    'SELECT department, COUNT(*) as count FROM routing_history WHERE department IS NOT NULL GROUP BY department'
  ).all() as Array<{ department: string; count: number }>;

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.department] = row.count;
  }
  return counts;
}

function safeJsonParse<T>(raw: unknown, fallback: T, context: string): T {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    logger.warn({ raw, context }, 'Failed to parse JSON from database');
    return fallback;
  }
}

function mapRow(row: Record<string, unknown>): RoutingHistoryEntry {
  return {
    id: row.id as number,
    parcelId: row.parcel_id as string,
    weight: row.weight as number,
    value: row.value as number,
    destination: safeJsonParse(row.destination, { country: '', city: '', postalCode: '' }, 'destination'),
    description: row.description as string | undefined,
    department: row.department as string | null,
    requiresApproval: Boolean(row.requires_approval),
    matchedRules: safeJsonParse(row.matched_rules, [], 'matched_rules'),
    status: row.status as 'completed' | 'pending_approval' | 'error',
    batchId: row.batch_id as string | undefined,
    createdAt: row.created_at as string,
  };
}
