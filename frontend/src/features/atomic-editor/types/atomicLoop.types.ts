export type LoopDataSourceType = "static" | "cms_products" | "cms_blog";

export type LoopDataItem = Record<string, any>;

export interface DynamicFieldBinding {
  elementKey: string; // e.g. "title", "price", "image", "buttonText"
  itemPropertyKey: string; // Key in data item object e.g. "title", "price"
  staticPrefix?: string; // Optional static text e.g. "Starting at "
  staticSuffix?: string;
}

export interface LoopTemplateConfig {
  id: string;
  name: string;
  bindings: DynamicFieldBinding[];
}

export interface LoopContainerConfig {
  id: string;
  name: string;
  category?: string;
  dataSourceType: LoopDataSourceType;
  staticDataJson?: string;
  itemsLimit?: number;
  template: LoopTemplateConfig;
  emptyStateText: string;
  loadingStateText: string;
  errorStateText: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoopPayload {
  name: string;
  category?: string;
  dataSourceType?: LoopDataSourceType;
}

export interface LoopRenderContext {
  item: LoopDataItem;
  index: number;
  count: number;
}
