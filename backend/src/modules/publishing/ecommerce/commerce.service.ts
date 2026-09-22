/**
 * Phase 18: Advanced E-Commerce & WooCommerce Parity — Commerce Service
 *
 * Provides pure business-logic helpers for product catalog management,
 * cart/checkout state, order lifecycle, and discount/coupon evaluation.
 *
 * Additive only — does not modify CanonicalWebsiteData or existing services.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommerceProduct {
  /** Unique product SKU or generated id */
  id: string;
  name: string;
  description?: string;
  price: number;
  salePrice?: number;
  currency: string;
  images: string[];
  categories: string[];
  tags: string[];
  stock: number | "unlimited";
  type: "simple" | "variable" | "grouped" | "external";
  status: "publish" | "draft" | "pending";
  attributes?: ProductAttribute[];
  variants?: ProductVariant[];
  weight?: number;
  dimensions?: { length?: number; width?: number; height?: number };
  digitalDownload?: boolean;
  downloadUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  slug: string;
}

export interface ProductAttribute {
  name: string;
  values: string[];
  isVariant: boolean;
}

export interface ProductVariant {
  id: string;
  attributes: Record<string, string>;
  price: number;
  salePrice?: number;
  stock: number;
  sku?: string;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  name: string;
}

export interface Cart {
  items: CartItem[];
  couponCode?: string;
  discountAmount: number;
  shippingCost: number;
  taxRate: number;
  currency: string;
}

export interface Order {
  id: string;
  websiteId: string;
  customerId?: string;
  customerEmail: string;
  customerName: string;
  status: OrderStatus;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
  currency: string;
  couponCode?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  paymentMethod?: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "refunded"
  | "failed";

export interface Address {
  firstName?: string;
  lastName?: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  postcode: string;
  country: string;
  phone?: string;
}

export interface Coupon {
  code: string;
  type: "percent" | "fixed_cart" | "fixed_product";
  amount: number;
  minOrderAmount?: number;
  maxUsage?: number;
  usageCount: number;
  expiresAt?: string;
  productIds?: string[];
  categoryIds?: string[];
}

export interface CommerceSettings {
  currency: string;
  currencySymbol: string;
  currencyPosition: "before" | "after";
  thousandSeparator: string;
  decimalSeparator: string;
  numDecimals: number;
  taxEnabled: boolean;
  taxRate: number;
  taxIncludedInPrice: boolean;
  shippingEnabled: boolean;
  weightUnit: "kg" | "g" | "lbs" | "oz";
  dimensionUnit: "m" | "cm" | "mm" | "in" | "yd" | "ft";
  allowGuestCheckout: boolean;
  checkoutFields: CheckoutField[];
}

export interface CheckoutField {
  id: string;
  label: string;
  type: "text" | "email" | "tel" | "select" | "checkbox" | "textarea";
  required: boolean;
  section: "billing" | "shipping" | "account" | "additional";
  options?: string[];
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_COMMERCE_SETTINGS: CommerceSettings = {
  currency: "USD",
  currencySymbol: "$",
  currencyPosition: "before",
  thousandSeparator: ",",
  decimalSeparator: ".",
  numDecimals: 2,
  taxEnabled: false,
  taxRate: 0,
  taxIncludedInPrice: false,
  shippingEnabled: false,
  weightUnit: "kg",
  dimensionUnit: "cm",
  allowGuestCheckout: true,
  checkoutFields: [
    { id: "billing_first_name", label: "First name", type: "text", required: true, section: "billing" },
    { id: "billing_last_name", label: "Last name", type: "text", required: true, section: "billing" },
    { id: "billing_email", label: "Email address", type: "email", required: true, section: "billing" },
    { id: "billing_phone", label: "Phone", type: "tel", required: false, section: "billing" },
    { id: "billing_street1", label: "Street address", type: "text", required: true, section: "billing" },
    { id: "billing_city", label: "City", type: "text", required: true, section: "billing" },
    { id: "billing_postcode", label: "Postcode / ZIP", type: "text", required: true, section: "billing" },
    { id: "billing_country", label: "Country", type: "text", required: true, section: "billing" },
    { id: "order_notes", label: "Order notes", type: "textarea", required: false, section: "additional" },
  ],
};

// ---------------------------------------------------------------------------
// Product Validation
// ---------------------------------------------------------------------------

/**
 * Validates and sanitises a product object, filling defaults where missing.
 * Returns the sanitised product or throws an error if required fields are absent.
 */
export function validateProduct(raw: Partial<CommerceProduct>): CommerceProduct {
  if (!raw.name || typeof raw.name !== "string" || raw.name.trim() === "") {
    throw new Error("Product name is required");
  }
  if (typeof raw.price !== "number" || raw.price < 0) {
    throw new Error("Product price must be a non-negative number");
  }

  const id = raw.id || generateSlug(raw.name) + "-" + Math.random().toString(36).slice(2, 7);
  const slug = raw.slug || generateSlug(raw.name);

  return {
    id,
    name: raw.name.trim(),
    description: raw.description || "",
    price: raw.price,
    salePrice: typeof raw.salePrice === "number" ? raw.salePrice : undefined,
    currency: sanitizeCurrency(raw.currency || "USD"),
    images: Array.isArray(raw.images) ? raw.images.filter((u: any) => typeof u === "string") : [],
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    stock: raw.stock === "unlimited" ? "unlimited" : (typeof raw.stock === "number" ? Math.max(0, raw.stock) : 0),
    type: (["simple", "variable", "grouped", "external"] as const).includes(raw.type as any)
      ? (raw.type as CommerceProduct["type"])
      : "simple",
    status: (["publish", "draft", "pending"] as const).includes(raw.status as any)
      ? (raw.status as CommerceProduct["status"])
      : "draft",
    attributes: Array.isArray(raw.attributes) ? raw.attributes : [],
    variants: Array.isArray(raw.variants) ? raw.variants.map(sanitizeVariant) : [],
    weight: typeof raw.weight === "number" ? raw.weight : undefined,
    dimensions: raw.dimensions || undefined,
    digitalDownload: raw.digitalDownload === true,
    downloadUrl: raw.downloadUrl || undefined,
    metaTitle: raw.metaTitle || raw.name.trim(),
    metaDescription: raw.metaDescription || raw.description || "",
    slug,
  };
}

function sanitizeVariant(v: any): ProductVariant {
  return {
    id: v.id || Math.random().toString(36).slice(2, 9),
    attributes: typeof v.attributes === "object" ? v.attributes : {},
    price: typeof v.price === "number" ? v.price : 0,
    salePrice: typeof v.salePrice === "number" ? v.salePrice : undefined,
    stock: typeof v.stock === "number" ? Math.max(0, v.stock) : 0,
    sku: v.sku || undefined,
  };
}

// ---------------------------------------------------------------------------
// Cart Calculations
// ---------------------------------------------------------------------------

/**
 * Computes cart totals: subtotal, discount, shipping, tax, grand total.
 */
export function calculateCartTotals(
  cart: Cart,
  settings: CommerceSettings = DEFAULT_COMMERCE_SETTINGS,
  coupon?: Coupon
): {
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
} {
  const subtotal = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  let discountAmount = 0;
  if (coupon) {
    discountAmount = computeCouponDiscount(coupon, cart.items, subtotal);
  } else {
    discountAmount = cart.discountAmount || 0;
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const shippingCost = settings.shippingEnabled ? cart.shippingCost : 0;

  const taxable = settings.taxIncludedInPrice ? 0 : discountedSubtotal + shippingCost;
  const taxAmount = settings.taxEnabled ? roundPrice(taxable * (settings.taxRate / 100)) : 0;

  const total = roundPrice(discountedSubtotal + shippingCost + taxAmount);

  return {
    subtotal: roundPrice(subtotal),
    discountAmount: roundPrice(discountAmount),
    shippingCost: roundPrice(shippingCost),
    taxAmount,
    total,
  };
}

/**
 * Evaluates a coupon against the cart items and returns the discount amount.
 */
export function computeCouponDiscount(coupon: Coupon, items: CartItem[], subtotal: number): number {
  // Expiry check
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return 0;
  }

  // Usage limit check
  if (typeof coupon.maxUsage === "number" && coupon.usageCount >= coupon.maxUsage) {
    return 0;
  }

  // Minimum order amount check
  if (typeof coupon.minOrderAmount === "number" && subtotal < coupon.minOrderAmount) {
    return 0;
  }

  switch (coupon.type) {
    case "percent":
      return subtotal * (Math.min(100, Math.max(0, coupon.amount)) / 100);
    case "fixed_cart":
      return Math.min(subtotal, Math.max(0, coupon.amount));
    case "fixed_product": {
      let discountBase = 0;
      if (coupon.productIds && coupon.productIds.length > 0) {
        for (const item of items) {
          if (coupon.productIds.includes(item.productId)) {
            discountBase += item.unitPrice * item.quantity;
          }
        }
      } else {
        discountBase = subtotal;
      }
      return Math.min(discountBase, Math.max(0, coupon.amount));
    }
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Order Lifecycle Transitions
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "on-hold", "cancelled", "failed"],
  "on-hold": ["processing", "cancelled"],
  processing: ["completed", "cancelled", "refunded", "on-hold"],
  completed: ["refunded"],
  cancelled: [],
  refunded: [],
  failed: ["pending"],
};

/**
 * Returns true if from -> to is a legal order status transition.
 */
export function isValidOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Returns the canonical next statuses from a given status.
 */
export function getNextOrderStatuses(current: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[current] || [];
}

// ---------------------------------------------------------------------------
// Commerce Settings Validation
// ---------------------------------------------------------------------------

export function validateCommerceSettings(raw: any): CommerceSettings {
  const base = DEFAULT_COMMERCE_SETTINGS;
  return {
    currency: sanitizeCurrency(raw?.currency || base.currency),
    currencySymbol: typeof raw?.currencySymbol === "string" ? raw.currencySymbol.slice(0, 5) : base.currencySymbol,
    currencyPosition: raw?.currencyPosition === "after" ? "after" : "before",
    thousandSeparator: typeof raw?.thousandSeparator === "string" ? raw.thousandSeparator.slice(0, 1) : base.thousandSeparator,
    decimalSeparator: typeof raw?.decimalSeparator === "string" ? raw.decimalSeparator.slice(0, 1) : base.decimalSeparator,
    numDecimals: typeof raw?.numDecimals === "number" ? Math.min(8, Math.max(0, raw.numDecimals)) : base.numDecimals,
    taxEnabled: raw?.taxEnabled === true,
    taxRate: typeof raw?.taxRate === "number" ? Math.min(100, Math.max(0, raw.taxRate)) : base.taxRate,
    taxIncludedInPrice: raw?.taxIncludedInPrice === true,
    shippingEnabled: raw?.shippingEnabled === true,
    weightUnit: (["kg", "g", "lbs", "oz"] as const).includes(raw?.weightUnit) ? raw.weightUnit : base.weightUnit,
    dimensionUnit: (["m", "cm", "mm", "in", "yd", "ft"] as const).includes(raw?.dimensionUnit) ? raw.dimensionUnit : base.dimensionUnit,
    allowGuestCheckout: raw?.allowGuestCheckout !== false,
    checkoutFields: Array.isArray(raw?.checkoutFields) ? raw.checkoutFields : base.checkoutFields,
  };
}

// ---------------------------------------------------------------------------
// Coupon Validation
// ---------------------------------------------------------------------------

export function validateCoupon(raw: any): Coupon {
  if (!raw?.code || typeof raw.code !== "string" || raw.code.trim() === "") {
    throw new Error("Coupon code is required");
  }
  const type = (["percent", "fixed_cart", "fixed_product"] as const).includes(raw.type)
    ? raw.type
    : "fixed_cart";
  const amount = typeof raw.amount === "number" ? Math.max(0, raw.amount) : 0;

  return {
    code: raw.code.trim().toUpperCase(),
    type,
    amount,
    minOrderAmount: typeof raw.minOrderAmount === "number" ? raw.minOrderAmount : undefined,
    maxUsage: typeof raw.maxUsage === "number" ? raw.maxUsage : undefined,
    usageCount: typeof raw.usageCount === "number" ? raw.usageCount : 0,
    expiresAt: raw.expiresAt || undefined,
    productIds: Array.isArray(raw.productIds) ? raw.productIds : undefined,
    categoryIds: Array.isArray(raw.categoryIds) ? raw.categoryIds : undefined,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export function formatPrice(amount: number, settings: CommerceSettings): string {
  const fixed = amount.toFixed(settings.numDecimals);
  const [whole, decimal] = fixed.split(".");
  const formatted =
    whole.replace(/\B(?=(\d{3})+(?!\d))/g, settings.thousandSeparator) +
    (decimal !== undefined ? settings.decimalSeparator + decimal : "");
  return settings.currencyPosition === "before"
    ? `${settings.currencySymbol}${formatted}`
    : `${formatted}${settings.currencySymbol}`;
}

function roundPrice(n: number): number {
  return Math.round(n * 100) / 100;
}

function sanitizeCurrency(code: string): string {
  return /^[A-Z]{3}$/.test(code) ? code : "USD";
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Builds a basic WooCommerce-compatible REST payload from a CommerceProduct.
 * Used for parity mapping during WC exports.
 */
export function toWooCommercePayload(product: CommerceProduct): Record<string, any> {
  return {
    name: product.name,
    slug: product.slug,
    status: product.status,
    type: product.type,
    description: product.description || "",
    short_description: "",
    sku: product.id,
    price: String(product.price),
    sale_price: product.salePrice !== undefined ? String(product.salePrice) : "",
    regular_price: String(product.price),
    manage_stock: product.stock !== "unlimited",
    stock_quantity: product.stock === "unlimited" ? null : product.stock,
    images: product.images.map((src, i) => ({ src, name: `${product.slug}-image-${i + 1}` })),
    categories: product.categories.map((name) => ({ name })),
    tags: product.tags.map((name) => ({ name })),
    weight: product.weight !== undefined ? String(product.weight) : "",
    dimensions: product.dimensions
      ? {
          length: String(product.dimensions.length || ""),
          width: String(product.dimensions.width || ""),
          height: String(product.dimensions.height || ""),
        }
      : {},
    attributes: (product.attributes || []).map((a) => ({
      name: a.name,
      options: a.values,
      variation: a.isVariant,
    })),
    meta_data: [
      { key: "_fs_digital_download", value: product.digitalDownload ? "yes" : "no" },
      { key: "_fs_download_url", value: product.downloadUrl || "" },
    ],
  };
}
