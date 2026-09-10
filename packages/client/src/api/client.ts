const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || `Request failed with status ${res.status}`);
  }

  return data;
}

export interface ParcelInput {
  weight: number;
  value: number;
  destination: { country: string; city: string; postalCode: string };
  description?: string;
  sender: { name: string; address: string };
}

export interface RoutingResult {
  parcelId: string;
  department: string | null;
  requiresApproval: boolean;
  approvalType?: string;
  matchedRules: Array<{
    ruleId: string;
    ruleName: string;
    action: { type: string; department?: string; message: string };
  }>;
  timestamp: string;
}

export interface BatchJob {
  id: string;
  filename: string;
  totalCount: number;
  processed: number;
  successCount: number;
  errorCount: number;
  status: 'processing' | 'completed' | 'failed';
  errors: Array<{ index: number; error: string }>;
  createdAt: string;
  completedAt?: string;
}

export interface HistoryEntry {
  id: number;
  parcelId: string;
  weight: number;
  value: number;
  destination: { country: string; city: string; postalCode: string };
  department: string | null;
  requiresApproval: boolean;
  status: string;
  createdAt: string;
}

export const api = {
  routeParcel: (parcel: ParcelInput) =>
    request<{ success: boolean; data: RoutingResult }>('/parcels/route', {
      method: 'POST',
      body: JSON.stringify(parcel),
    }),

  uploadBatch: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/parcels/batch`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Batch upload failed');
    return data as { success: boolean; data: { jobId: string } };
  },

  getBatchStatus: (jobId: string) =>
    request<{ success: boolean; data: BatchJob }>(`/parcels/batch/${jobId}`),

  getRoutingRules: () =>
    request<{ success: boolean; data: unknown[] }>('/routing/rules'),

  getRoutingHistory: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request<{
      success: boolean;
      data: HistoryEntry[];
      pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
    }>(`/routing/history${query}`);
  },

  getRecentActivity: () =>
    request<{ success: boolean; data: HistoryEntry[] }>('/routing/recent'),

  getRouteStats: () =>
    request<{ success: boolean; data: { routeCounts: Record<string, number> } }>('/routing/stats'),

  getMetrics: () =>
    request<{
      success: boolean;
      data: {
        routeCounts: Record<string, number>;
        totalProcessed: number;
        avgLatencyMs: number;
        p95LatencyMs: number;
        errorRate: number;
        uptimeSeconds: number;
        anomalies: Array<{ type: string; message: string; severity: string }>;
      };
    }>('/metrics'),

  getHealth: () =>
    request<{ status: string; checks: Record<string, boolean>; timestamp: string }>('/health/ready'),
};
