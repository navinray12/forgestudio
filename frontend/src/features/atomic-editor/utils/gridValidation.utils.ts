/**
 * @file Atomic editor feature: grid Validation utils. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { GridContainerConfig, GridItemPlacement } from "../types/atomicGrid.types";

export interface GridValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates grid container settings

 * @param config Config supplied to this operation (type: Partial<GridContainerConfig>).
 */
export function validateGridConfig(config: Partial<GridContainerConfig>): GridValidationResult {
  const errors: string[] = [];

  if (config.columns !== undefined && config.columns < 1) {
    errors.push("Column count must be at least 1.");
  }

  if (config.name !== undefined && !config.name.trim()) {
    errors.push("Grid container name cannot be empty.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates grid item placement against grid bounds

 * @param item Item supplied to this operation (type: Partial<GridItemPlacement>).
 * @param totalColumns Total Columns supplied to this operation (type: number).
 */
export function validateGridItemPlacement(
  item: Partial<GridItemPlacement>,
  totalColumns: number
): GridValidationResult {
  const errors: string[] = [];

  if (item.columnStart !== undefined && item.columnStart < 1) {
    errors.push("Column start position must be at least 1.");
  }

  if (item.rowStart !== undefined && item.rowStart < 1) {
    errors.push("Row start position must be at least 1.");
  }

  if (item.columnSpan !== undefined && item.columnSpan < 1) {
    errors.push("Column span must be at least 1.");
  }

  if (item.rowSpan !== undefined && item.rowSpan < 1) {
    errors.push("Row span must be at least 1.");
  }

  if (
    item.columnStart !== undefined &&
    item.columnSpan !== undefined &&
    item.columnStart + item.columnSpan - 1 > totalColumns
  ) {
    errors.push(`Item span exceeds available ${totalColumns} columns.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
