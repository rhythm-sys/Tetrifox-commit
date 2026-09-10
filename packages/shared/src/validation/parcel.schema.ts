import { z } from 'zod';

export const DestinationSchema = z.object({
  country: z.string().min(2).max(3).regex(/^[A-Z]{2,3}$/, 'Must be an ISO country code (e.g., DE, NL)'),
  city: z.string().min(1).max(200),
  postalCode: z.string().min(1).max(20),
});

export const SenderSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
});

export const ParcelInputSchema = z.object({
  weight: z.number().positive('Weight must be positive').max(10000, 'Weight cannot exceed 10,000 kg'),
  value: z.number().nonnegative('Value cannot be negative').max(10_000_000, 'Value cannot exceed €10,000,000'),
  destination: DestinationSchema,
  description: z.string().max(1000).optional(),
  sender: SenderSchema,
  attributes: z.record(z.unknown()).optional(),
});

export const BatchParcelArraySchema = z.array(ParcelInputSchema).min(1, 'Batch must contain at least one parcel').max(100_000, 'Batch cannot exceed 100,000 parcels');

export const HistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  department: z.string().optional(),
  status: z.enum(['completed', 'pending_approval', 'error']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'weight', 'value', 'department']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Rule config validation
const LeafConditionSchema: z.ZodType = z.object({
  field: z.string().min(1),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'regex', 'between']),
  value: z.unknown(),
});

const ConditionGroupSchema: z.ZodType = z.lazy(() =>
  z.object({
    all: z.array(z.union([LeafConditionSchema, ConditionGroupSchema])).optional(),
    any: z.array(z.union([LeafConditionSchema, ConditionGroupSchema])).optional(),
  }).refine(
    (data) => data.all !== undefined || data.any !== undefined,
    'Condition group must have either "all" or "any"'
  )
);

const RuleActionSchema = z.object({
  type: z.enum(['route', 'require_approval', 'reject', 'flag']),
  department: z.string().optional(),
  approvalType: z.string().optional(),
  message: z.string().min(1),
});

const RuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  priority: z.number().int().min(0),
  enabled: z.boolean(),
  conditions: ConditionGroupSchema,
  action: RuleActionSchema,
  metadata: z.record(z.unknown()).optional(),
});

export const RuleConfigSchema = z.object({
  version: z.string(),
  evaluationMode: z.enum(['first-match', 'all-matches']),
  rules: z.array(RuleSchema).min(1, 'At least one rule is required'),
});

export type ValidatedParcelInput = z.infer<typeof ParcelInputSchema>;
export type ValidatedHistoryQuery = z.infer<typeof HistoryQuerySchema>;
