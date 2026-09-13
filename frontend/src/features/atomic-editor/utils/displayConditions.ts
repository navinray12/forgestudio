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
  | "in"
  | "not-in"
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
  conditions?: DisplayCondition[];
  groups?: DisplayConditionGroup[];
}

export type DisplayConditionContext = Record<string, unknown>;

const MAX_FIELD_PATH_LENGTH = 300;
const MAX_GROUP_DEPTH = 20;
const MAX_GROUP_ITEMS = 100;

function getPathValue(context: DisplayConditionContext, path: string): unknown {
  const normalizedPath = path.trim();
  if (!normalizedPath || normalizedPath.length > MAX_FIELD_PATH_LENGTH) return undefined;

  return normalizedPath.split(".").reduce<unknown>((current, key) => {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    if (!/^[A-Za-z0-9_$-]+$/.test(key)) return undefined;
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

function asComparableString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function isInCollection(expected: unknown, actual: unknown): boolean {
  if (!Array.isArray(expected)) return false;
  return expected.some((item) => Object.is(item, actual));
}

export function evaluateDisplayCondition(
  condition: DisplayCondition,
  context: DisplayConditionContext,
): boolean {
  if (!condition || typeof condition.field !== "string") return false;

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
      return Object.is(actual, expected);
    case "not-equals":
      return !Object.is(actual, expected);
    case "contains":
      if (Array.isArray(actual)) return actual.some((item) => Object.is(item, expected));
      return typeof actual === "string" && typeof expected === "string"
        ? actual.includes(expected)
        : false;
    case "starts-with": {
      const left = asComparableString(actual);
      const right = asComparableString(expected);
      return left !== null && right !== null && left.startsWith(right);
    }
    case "ends-with": {
      const left = asComparableString(actual);
      const right = asComparableString(expected);
      return left !== null && right !== null && left.endsWith(right);
    }
    case "in":
      return isInCollection(expected, actual);
    case "not-in":
      return !isInCollection(expected, actual);
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
  depth = 0,
): boolean {
  if (!group) return true;
  if (depth > MAX_GROUP_DEPTH) return false;

  const conditions = Array.isArray(group.conditions)
    ? group.conditions.slice(0, MAX_GROUP_ITEMS)
    : [];
  const groups = Array.isArray(group.groups)
    ? group.groups.slice(0, MAX_GROUP_ITEMS)
    : [];

  if (conditions.length === 0 && groups.length === 0) return true;

  const results = [
    ...conditions.map((condition) => evaluateDisplayCondition(condition, context)),
    ...groups.map((nestedGroup) => evaluateDisplayConditions(nestedGroup, context, depth + 1)),
  ];

  return group.mode === "any" ? results.some(Boolean) : results.every(Boolean);
}
