import type { RoutingResult, BatchJob, RoutingHistoryEntry } from './parcel.js';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export type RouteParcelResponse = ApiResponse<RoutingResult>;

export type BatchUploadResponse = ApiResponse<{ jobId: string }>;

export type BatchStatusResponse = ApiResponse<BatchJob>;

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export type RoutingHistoryResponse = PaginatedResponse<RoutingHistoryEntry>;

export interface HistoryQueryParams {
  page?: number;
  pageSize?: number;
  department?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MetricsSummary {
  routeCounts: Record<string, number>;
  totalProcessed: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number;
  uptimeSeconds: number;
  anomalies: Anomaly[];
}

export interface Anomaly {
  type: string;
  message: string;
  detectedAt: string;
  severity: 'warning' | 'critical';
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  checks: {
    database: boolean;
    rulesLoaded: boolean;
    engineReady: boolean;
  };
  timestamp: string;
}
