import React, { useEffect, useRef } from "react";
import { attachInteractions, type InteractionDefinition } from "../utils/interactionEngine";

export interface InteractionRuntimeProps {
  definitions: InteractionDefinition[];
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Runtime boundary for editor preview/live rendering.
 *
 * The component owns the DOM lifecycle and delegates all behavior to the
 * dependency-free interaction engine. It intentionally renders no editor UI,
 * which keeps runtime behavior separate from configuration panels.
 */
export function InteractionRuntime({
  definitions,
  children,
  disabled = false,
  className,
}: InteractionRuntimeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || disabled) return undefined;

    return attachInteractions(root, definitions);
  }, [definitions, disabled]);

  return (
    <div ref={rootRef} className={className} data-forgestudio-interaction-runtime="true">
      {children}
    </div>
  );
}

export default InteractionRuntime;
