export interface HTMLAttributeConfig {
  name: string;
  value: string;
}

export interface BlockNode {
  id: string;
  type?: string;
  className?: string;
  anchor?: string;
  style?: Record<string, any>;
  attributes?: {
    srcset?: string;
    sizes?: string;
    loading?: string;
    alt?: string;
    scrollSnapType?: string;
    scrollSnapAlign?: string;
    scrollSnapStop?: string;
    masonryMode?: boolean;
    masonryColumns?: number;
    masonryGap?: number;
    masonryEngine?: string;
    wpWidgetTitle?: string;
    wpWidgetType?: string;
    wpWidgetContent?: string;
    wpWidgetShowCount?: boolean;
    wpWidgetDropdown?: boolean;
    htmlAttributes?: HTMLAttributeConfig[];
    [key: string]: any;
  };
  [key: string]: any;
}
