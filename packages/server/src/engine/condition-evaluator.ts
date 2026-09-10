import type { ConditionGroup, LeafCondition } from '@parcel-routing/shared';
import { getOperator } from './operators.js';

const MAX_RECURSION_DEPTH = 10;

function isLeafCondition(condition: LeafCondition | ConditionGroup): condition is LeafCondition {
  return 'field' in condition && 'operator' in condition;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function evaluateLeaf(condition: LeafCondition, data: Record<string, unknown>): boolean {
  const fieldValue = getNestedValue(data, condition.field);
  const operatorFn = getOperator(condition.operator);
  if (!operatorFn) {
    throw new Error(`Unknown operator: ${condition.operator}`);
  }
  return operatorFn(fieldValue, condition.value);
}

export function evaluateConditions(
  group: ConditionGroup,
  data: Record<string, unknown>,
  depth: number = 0
): boolean {
  if (depth > MAX_RECURSION_DEPTH) {
    throw new Error(`Condition nesting exceeds maximum depth of ${MAX_RECURSION_DEPTH}`);
  }

  if (group.all) {
    return group.all.every((condition) => {
      if (isLeafCondition(condition)) {
        return evaluateLeaf(condition, data);
      }
      return evaluateConditions(condition, data, depth + 1);
    });
  }

  if (group.any) {
    return group.any.some((condition) => {
      if (isLeafCondition(condition)) {
        return evaluateLeaf(condition, data);
      }
      return evaluateConditions(condition, data, depth + 1);
    });
  }

  return false;
}
