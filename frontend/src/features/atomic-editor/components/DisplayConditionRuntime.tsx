import React, { useMemo } from "react";
import {
  evaluateDisplayConditions,
  type DisplayConditionContext,
  type DisplayConditionGroup,
} from "../utils/displayConditions";

export interface DisplayConditionRuntimeProps {
  conditions?: DisplayConditionGroup;
  context: DisplayConditionContext;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Declarative render boundary for conditional visibility.
 * The evaluator is pure, so callers can supply CMS/user/device context without
 * coupling the condition engine to browser globals or a particular backend.
 */
export function DisplayConditionRuntime({
  conditions,
  context,
  children,
  fallback = null,
}: DisplayConditionRuntimeProps) {
  const visible = useMemo(
    () => evaluateDisplayConditions(conditions, context),
    [conditions, context],
  );

  return visible ? <>{children}</> : <>{fallback}</>;
}

export default DisplayConditionRuntime;
