import { useState, useEffect, useCallback, useMemo } from "react";
import type { ReusableComponentDefinition } from "../types/reusableComponents.types";
import type { ResolvedComponentProperty } from "../types/controlledComponent.types";
import { ControlledComponentService } from "../services/controlledComponentService";
import { resolveInstanceProperties } from "../utils/componentOverride.utils";

export function useControlledComponent(
  component: ReusableComponentDefinition | null,
  instanceId: string = "instance-demo-1"
) {
  const [allowedKeys, setAllowedKeys] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [isLockModalOpen, setIsLockModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (component) {
      const keys = ControlledComponentService.getComponentLockSettings(component.id);
      setAllowedKeys(keys);
      const instanceOv = ControlledComponentService.getInstanceOverrides(instanceId);
      setOverrides(instanceOv);
    }
  }, [component, instanceId]);

  const resolvedProperties = useMemo<ResolvedComponentProperty[]>(() => {
    if (!component) return [];
    return resolveInstanceProperties(component, allowedKeys, overrides);
  }, [component, allowedKeys, overrides]);

  const setPropertyOverride = useCallback(
    (propertyKey: string, value: string) => {
      if (!component) return;
      const updated = ControlledComponentService.saveInstanceOverride(instanceId, propertyKey, value);
      setOverrides({ ...updated });
    },
    [component, instanceId]
  );

  const resetPropertyOverride = useCallback(
    (propertyKey: string) => {
      if (!component) return;
      const updated = ControlledComponentService.resetInstanceOverride(instanceId, propertyKey);
      setOverrides({ ...updated });
    },
    [component, instanceId]
  );

  const updateLockSettings = useCallback(
    (newAllowedKeys: string[]) => {
      if (!component) return;
      ControlledComponentService.saveComponentLockSettings(component.id, newAllowedKeys);
      setAllowedKeys(newAllowedKeys);
    },
    [component]
  );

  return {
    allowedKeys,
    overrides,
    resolvedProperties,
    isLockModalOpen,
    setIsLockModalOpen,
    setPropertyOverride,
    resetPropertyOverride,
    updateLockSettings,
  };
}
