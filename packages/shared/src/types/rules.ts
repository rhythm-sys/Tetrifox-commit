export type ComparisonOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'nin'
  | 'regex'
  | 'between';

export interface LeafCondition {
  field: string;
  operator: ComparisonOperator;
  value: unknown;
}

export interface ConditionGroup {
  all?: (LeafCondition | ConditionGroup)[];
  any?: (LeafCondition | ConditionGroup)[];
}

export type ActionType = 'route' | 'require_approval' | 'reject' | 'flag';

export interface RuleAction {
  type: ActionType;
  department?: string;
  approvalType?: string;
  message: string;
}

export interface Rule {
  id: string;
  name: string;
  description?: string;
  priority: number;
  enabled: boolean;
  conditions: ConditionGroup;
  action: RuleAction;
  metadata?: Record<string, unknown>;
}

export type EvaluationMode = 'first-match' | 'all-matches';

export interface RuleConfig {
  version: string;
  evaluationMode: EvaluationMode;
  rules: Rule[];
}
