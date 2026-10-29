export type LoopDataSourceType = "static" | "cms_products" | "cms_blog" | "cpt";

export type LoopDataItem = Record<string, any>;

export interface DynamicFieldBinding {
  elementKey: string; // e.g. "title", "price", "image", "buttonText", "description", "badge"
  itemPropertyKey: string; // Key in data item object e.g. "title", "price", "client"
  staticPrefix?: string; // Optional static text e.g. "Client: "
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
  cptId?: string;
  cptSlug?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  statusFilter?: string;
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
