export type DisplayConditionOperator =
  | "exists"
  | "not-exists"
  | "truthy"
  | "falsy"
  | "equals"
  | "not-equals"
  | "contains"
  | "starts-with"
  | "ends-with"
  | "greater-than"
  | "greater-than-or-equal"
  | "less-than"
  | "less-than-or-equal";

export interface DisplayCondition {
  field: string;
  operator: DisplayConditionOperator;
  value?: unknown;
}

export interface DisplayConditionGroup {
  mode: "all" | "any";
  conditions: DisplayCondition[];
}

export type DisplayConditionContext = Record<string, unknown>;

function getPathValue(context: DisplayConditionContext, path: string): unknown {
  if (!path.trim()) return undefined;
  return path.split(".").reduce<unknown>((current, key) => {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, context);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function evaluateDisplayCondition(
  condition: DisplayCondition,
  context: DisplayConditionContext,
): boolean {
  const actual = getPathValue(context, condition.field);
  const expected = condition.value;

  switch (condition.operator) {
    case "exists":
      return actual !== undefined && actual !== null;
    case "not-exists":
      return actual === undefined || actual === null;
    case "truthy":
      return Boolean(actual);
    case "falsy":
      return !actual;
    case "equals":
      return actual === expected;
    case "not-equals":
      return actual !== expected;
    case "contains":
      if (Array.isArray(actual)) return actual.some((item) => item === expected);
      return typeof actual === "string" && typeof expected === "string"
        ? actual.includes(expected)
        : false;
    case "starts-with":
      return typeof actual === "string" && typeof expected === "string"
        ? actual.startsWith(expected)
        : false;
    case "ends-with":
      return typeof actual === "string" && typeof expected === "string"
        ? actual.endsWith(expected)
        : false;
    case "greater-than": {
      const left = asNumber(actual);
      const right = asNumber(expected);
      return left !== null && right !== null && left > right;
    }
    case "greater-than-or-equal": {
      const left = asNumber(actual);
      const right = asNumber(expected);
      return left !== null && right !== null && left >= right;
    }
    case "less-than": {
      const left = asNumber(actual);
      const right = asNumber(expected);
      return left !== null && right !== null && left < right;
    }
    case "less-than-or-equal": {
      const left = asNumber(actual);
      const right = asNumber(expected);
      return left !== null && right !== null && left <= right;
    }
    default:
      return false;
  }
}

export function evaluateDisplayConditions(
  group: DisplayConditionGroup | undefined,
  context: DisplayConditionContext,
): boolean {
  if (!group || group.conditions.length === 0) return true;

  if (group.mode === "any") {
    return group.conditions.some((condition) => evaluateDisplayCondition(condition, context));
  }

  return group.conditions.every((condition) => evaluateDisplayCondition(condition, context));
}
