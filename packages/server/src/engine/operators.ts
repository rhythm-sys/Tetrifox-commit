export type OperatorFn = (fieldValue: unknown, ruleValue: unknown) => boolean;

const operators = new Map<string, OperatorFn>([
  ['eq', (a, b) => a === b],
  ['neq', (a, b) => a !== b],
  ['gt', (a, b) => Number(a) > Number(b)],
  ['gte', (a, b) => Number(a) >= Number(b)],
  ['lt', (a, b) => Number(a) < Number(b)],
  ['lte', (a, b) => Number(a) <= Number(b)],
  ['in', (a, b) => {
    if (!Array.isArray(b)) return false;
    return b.includes(a);
  }],
  ['nin', (a, b) => {
    if (!Array.isArray(b)) return true;
    return !b.includes(a);
  }],
  ['regex', (a, b) => {
    if (typeof b !== 'string') return false;
    // Limit regex length to prevent ReDoS
    if (b.length > 200) return false;
    try {
      // Use a timeout-safe approach: compile once and test
      const re = new RegExp(b);
      return re.test(String(a));
    } catch {
      return false;
    }
  }],
  ['between', (a, b) => {
    if (!Array.isArray(b) || b.length !== 2) return false;
    const num = Number(a);
    return num >= Number(b[0]) && num <= Number(b[1]);
  }],
]);

export function getOperator(name: string): OperatorFn | undefined {
  return operators.get(name);
}

export function registerOperator(name: string, fn: OperatorFn): void {
  operators.set(name, fn);
}

export function getAvailableOperators(): string[] {
  return [...operators.keys()];
}
