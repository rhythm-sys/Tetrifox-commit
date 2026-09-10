import type { Rule, RuleConfig, EvaluationMode, ParcelInput, AppliedAction, RoutingResult } from '@parcel-routing/shared';
import { evaluateConditions } from './condition-evaluator.js';
import { nanoid } from 'nanoid';

export class RuleEngine {
  private rules: Rule[];
  private evaluationMode: EvaluationMode;

  constructor(config: RuleConfig) {
    this.evaluationMode = config.evaluationMode;
    this.rules = [...config.rules]
      .filter((r) => r.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  evaluate(parcel: ParcelInput): RoutingResult {
    const data = this.flattenParcel(parcel);
    const matchedActions: AppliedAction[] = [];

    for (const rule of this.rules) {
      const matches = evaluateConditions(rule.conditions, data);
      if (matches) {
        matchedActions.push({
          ruleId: rule.id,
          ruleName: rule.name,
          action: rule.action,
        });

        if (this.evaluationMode === 'first-match') {
          break;
        }
      }
    }

    const routeAction = matchedActions.find((a) => a.action.type === 'route');
    const approvalAction = matchedActions.find((a) => a.action.type === 'require_approval');

    return {
      parcelId: nanoid(12),
      department: routeAction?.action.department ?? null,
      requiresApproval: approvalAction !== undefined,
      approvalType: approvalAction?.action.approvalType,
      matchedRules: matchedActions,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * In "all-matches" mode, evaluate all rules and return all matched actions.
   * The insurance rule (priority 100) and the routing rule both match,
   * so the parcel gets flagged for approval AND assigned a department.
   *
   * In "first-match" mode, only the highest-priority matching rule fires.
   * For a high-value heavy parcel, only insurance fires (priority 100 > 50).
   * The routing must happen after approval is granted.
   */

  getRules(): Rule[] {
    return [...this.rules];
  }

  getRuleCount(): number {
    return this.rules.length;
  }

  private flattenParcel(parcel: ParcelInput): Record<string, unknown> {
    return {
      weight: parcel.weight,
      value: parcel.value,
      destination: parcel.destination,
      'destination.country': parcel.destination.country,
      'destination.city': parcel.destination.city,
      'destination.postalCode': parcel.destination.postalCode,
      description: parcel.description,
      sender: parcel.sender,
      'sender.name': parcel.sender.name,
      'sender.address': parcel.sender.address,
      ...parcel.attributes,
    };
  }
}
