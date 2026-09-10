export interface Destination {
  country: string;
  city: string;
  postalCode: string;
}

export interface Sender {
  name: string;
  address: string;
}

export interface ParcelInput {
  weight: number;
  value: number;
  destination: Destination;
  description?: string;
  sender: Sender;
  attributes?: Record<string, unknown>;
}

export interface Parcel extends ParcelInput {
  id: string;
  createdAt: string;
}

export interface AppliedAction {
  ruleId: string;
  ruleName: string;
  action: import('./rules.js').RuleAction;
}

export interface RoutingResult {
  parcelId: string;
  department: string | null;
  requiresApproval: boolean;
  approvalType?: string;
  matchedRules: AppliedAction[];
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
  errors: BatchError[];
  createdAt: string;
  completedAt?: string;
}

export interface BatchError {
  index: number;
  error: string;
  parcel?: Partial<ParcelInput>;
}

export interface RoutingHistoryEntry {
  id: number;
  parcelId: string;
  weight: number;
  value: number;
  destination: Destination;
  description?: string;
  department: string | null;
  requiresApproval: boolean;
  matchedRules: string[];
  status: 'completed' | 'pending_approval' | 'error';
  batchId?: string;
  createdAt: string;
}
