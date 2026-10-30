/**
 * Phase 18: Advanced E-Commerce & WooCommerce Parity — Commerce Service
 *
 * Provides pure business-logic helpers for product catalog management,
 * cart/checkout state, order lifecycle, and discount/coupon evaluation.
 *
 * Additive only — does not modify CanonicalWebsiteData or existing services.
 */

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";

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
  paymentStatus: "unpaid" | "pending" | "paid" | "failed" | "refunded";
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paymentReference?: string;
  paidAt?: string;
  paymentFailureReason?: string;
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

// ---------------------------------------------------------------------------
// Default Storefront Catalog (Fallback for unconfigured demo websites)
// ---------------------------------------------------------------------------

export const DEFAULT_COMMERCE_PRODUCTS: CommerceProduct[] = [
  {
    id: "wc-prod-101",
    name: "Aura Pro Wireless Headphones",
    price: 199.99,
    salePrice: 199.99,
    currency: "USD",
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"],
    categories: ["Audio & Sound"],
    tags: ["bestseller", "audio"],
    stock: "unlimited",
    type: "simple",
    status: "publish",
    slug: "aura-pro-wireless-headphones",
  },
  {
    id: "wc-prod-102",
    name: "ChronoSync Smart Fitness Watch",
    price: 179.00,
    salePrice: 149.50,
    currency: "USD",
    images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"],
    categories: ["Wearables"],
    tags: ["sale", "watch"],
    stock: "unlimited",
    type: "simple",
    status: "publish",
    slug: "chronosync-smart-fitness-watch",
  },
  {
    id: "wc-prod-103",
    name: "Vortex Hi-Fi Bluetooth Speaker",
    price: 109.99,
    salePrice: 89.99,
    currency: "USD",
    images: ["https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800"],
    categories: ["Audio & Sound"],
    tags: ["popular", "speaker"],
    stock: "unlimited",
    type: "simple",
    status: "publish",
    slug: "vortex-hi-fi-bluetooth-speaker",
  },
  {
    id: "wc-prod-104",
    name: "ErgoLift Aluminum Laptop Stand",
    price: 59.99,
    salePrice: 49.99,
    currency: "USD",
    images: ["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800"],
    categories: ["Accessories"],
    tags: ["ergonomics"],
    stock: "unlimited",
    type: "simple",
    status: "publish",
    slug: "ergolift-aluminum-laptop-stand",
  },
];

// ---------------------------------------------------------------------------
// Server-Side Trusted Price Resolution & Cart Calculation
// ---------------------------------------------------------------------------

export interface OrderResolutionInput {
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
  couponCode?: string;
  shippingCost?: number;
}

export interface ResolvedOrderCalculation {
  trustedItems: CartItem[];
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
  currency: string;
  coupon?: Coupon;
  settings: CommerceSettings;
}

/**
 * Resolves product items against the website's trusted catalog in editorData.
 * Strictly ignores any client-submitted prices, subtotals, taxes, or shipping costs.
 */
export function resolveTrustedOrderItemsAndTotals(
  website: any,
  input: OrderResolutionInput
): ResolvedOrderCalculation {
  if (!input?.items || !Array.isArray(input.items) || input.items.length === 0) {
    throw new AppError("Cart items are required to process checkout", 400, "INVALID_CART_ITEMS");
  }

  const editorData = website?.editorData || {};
  const customProducts: CommerceProduct[] = Array.isArray(editorData.commerceProducts) ? editorData.commerceProducts : [];
  const catalog = customProducts.length > 0 ? customProducts : DEFAULT_COMMERCE_PRODUCTS;
  const coupons: Coupon[] = Array.isArray(editorData.commerceCoupons) ? editorData.commerceCoupons : [];
  const settings = validateCommerceSettings(editorData.commerceSettings || {});

  const trustedItems: CartItem[] = [];

  for (const rawItem of input.items) {
    if (!rawItem.productId || typeof rawItem.productId !== "string") {
      throw new AppError("Invalid or missing product ID in cart item", 400, "INVALID_PRODUCT_ID");
    }

    const qty = Number(rawItem.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new AppError("Item quantity must be a positive whole integer", 400, "INVALID_QUANTITY");
    }

    // Resolve product in catalog
    const product = catalog.find(
      (p) => p.id === rawItem.productId || p.slug === rawItem.productId
    );

    if (!product) {
      throw new AppError(`Product '${rawItem.productId}' not found in website catalog`, 400, "PRODUCT_NOT_FOUND");
    }

    if (product.status && product.status !== "publish") {
      throw new AppError(`Product '${product.name}' is currently not available for purchase`, 400, "PRODUCT_NOT_AVAILABLE");
    }

    let unitPrice = typeof product.salePrice === "number" ? product.salePrice : product.price;
    let itemName = product.name;

    // Check variant if requested
    if (rawItem.variantId) {
      const variant = product.variants?.find((v) => v.id === rawItem.variantId);
      if (!variant) {
        throw new AppError(`Variant '${rawItem.variantId}' not found for product '${product.name}'`, 400, "VARIANT_NOT_FOUND");
      }
      unitPrice = typeof variant.salePrice === "number" ? variant.salePrice : variant.price;
      if (typeof variant.stock === "number" && variant.stock < qty) {
        throw new AppError(`Insufficient stock for selected variant of '${product.name}'`, 400, "INSUFFICIENT_STOCK");
      }
      const attrSummary = Object.entries(variant.attributes || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      if (attrSummary) {
        itemName += ` (${attrSummary})`;
      }
    } else {
      if (product.stock !== "unlimited" && typeof product.stock === "number" && product.stock < qty) {
        throw new AppError(`Insufficient stock for product '${product.name}'`, 400, "INSUFFICIENT_STOCK");
      }
    }

    trustedItems.push({
      productId: product.id,
      variantId: rawItem.variantId,
      quantity: qty,
      unitPrice: roundPrice(unitPrice),
      name: itemName,
    });
  }

  // Resolve coupon
  let coupon: Coupon | undefined;
  if (input.couponCode) {
    const code = String(input.couponCode).trim().toUpperCase();
    coupon = coupons.find((c) => c.code.toUpperCase() === code);
  }

  // Calculate cart totals
  const subtotal = roundPrice(trustedItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0));
  const defaultShipping = subtotal > 50 ? 0 : 9.99;
  const shippingCost = settings.shippingEnabled
    ? (typeof input.shippingCost === "number" && input.shippingCost >= 0 ? roundPrice(input.shippingCost) : defaultShipping)
    : 0;

  const rawTotals = calculateCartTotals(
    {
      items: trustedItems,
      couponCode: coupon?.code,
      discountAmount: 0,
      shippingCost,
      taxRate: settings.taxRate,
      currency: settings.currency,
    },
    settings,
    coupon
  );

  return {
    trustedItems,
    subtotal: rawTotals.subtotal,
    discountAmount: rawTotals.discountAmount,
    shippingCost: rawTotals.shippingCost,
    taxAmount: rawTotals.taxAmount,
    total: rawTotals.total,
    currency: settings.currency,
    coupon,
    settings,
  };
}

// ---------------------------------------------------------------------------
// Redirect URL Security Validation
// ---------------------------------------------------------------------------

export function validateRedirectUrl(providedUrl?: string, defaultUrl: string = ""): string {
  if (!providedUrl || typeof providedUrl !== "string" || !providedUrl.trim()) {
    return defaultUrl;
  }
  const trimmed = providedUrl.trim();
  // Relative paths
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    const appBaseUrl = (process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
    return `${appBaseUrl}${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return defaultUrl;
    }
    const host = parsed.hostname.toLowerCase();
    if (host === "javascript" || (host.startsWith("127.") && process.env.NODE_ENV === "production")) {
      return defaultUrl;
    }
    return trimmed;
  } catch {
    return defaultUrl;
  }
}

// ---------------------------------------------------------------------------
// Real Stripe Storefront Checkout Session Creation
// ---------------------------------------------------------------------------

export interface StorefrontCheckoutSessionParams {
  websiteId: string;
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
  couponCode?: string;
  customerEmail?: string;
  customerName?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  paymentMethod?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface StorefrontCheckoutSessionResult {
  success: boolean;
  orderId: string;
  sessionId: string;
  checkoutUrl: string;
  total: number;
  currency: string;
}

/**
 * Creates a real Stripe Checkout Session for storefront purchasing.
 * Fails safely with HTTP 503 if STRIPE_SECRET_KEY is not configured.
 */
export async function createStorefrontCheckoutSession(
  params: StorefrontCheckoutSessionParams
): Promise<StorefrontCheckoutSessionResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new AppError("Stripe payment gateway is not configured", 503, "PAYMENT_GATEWAY_NOT_CONFIGURED");
  }

  const website = await prisma.website.findUnique({ where: { id: params.websiteId } });
  if (!website) {
    throw new AppError("Website not found", 404, "WEBSITE_NOT_FOUND");
  }

  // 1. Resolve product IDs and variants against trusted catalog & compute total server-side
  const resolved = resolveTrustedOrderItemsAndTotals(website, {
    items: params.items,
    couponCode: params.couponCode,
  });

  const amountMinor = Math.round(resolved.total * 100);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new AppError("Payable amount must be greater than zero", 400, "INVALID_AMOUNT");
  }

  // 2. Create pending, unpaid order
  const orderId = "WC-ORD-" + Math.floor(100000 + Math.random() * 900000);
  const newOrder: Order = {
    id: orderId,
    websiteId: website.id,
    customerId: undefined,
    customerEmail: params.customerEmail?.trim() || "guest@example.com",
    customerName: params.customerName?.trim() || "Guest Customer",
    status: "pending",
    items: resolved.trustedItems,
    subtotal: resolved.subtotal,
    discountAmount: resolved.discountAmount,
    shippingCost: resolved.shippingCost,
    taxAmount: resolved.taxAmount,
    total: resolved.total,
    currency: resolved.currency,
    couponCode: resolved.coupon?.code,
    billingAddress: params.billingAddress,
    shippingAddress: params.shippingAddress,
    paymentMethod: params.paymentMethod || "stripe",
    paymentStatus: "unpaid",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 3. Construct and validate return URLs
  const appBaseUrl = (process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const defaultSuccess = `${appBaseUrl}/site/${website.id}?checkout=success&session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`;
  const defaultCancel = `${appBaseUrl}/site/${website.id}?checkout=cancel&order_id=${orderId}`;

  let successUrl = validateRedirectUrl(params.successUrl, defaultSuccess);
  let cancelUrl = validateRedirectUrl(params.cancelUrl, defaultCancel);

  if (!successUrl.includes("{CHECKOUT_SESSION_ID}")) {
    const sep = successUrl.includes("?") ? "&" : "?";
    successUrl = `${successUrl}${sep}session_id={CHECKOUT_SESSION_ID}`;
  }
  if (!successUrl.includes("order_id=")) {
    const sep = successUrl.includes("?") ? "&" : "?";
    successUrl = `${successUrl}${sep}order_id=${orderId}`;
  }

  // 4. Construct Stripe form-urlencoded payload
  const form = new URLSearchParams();
  form.append("mode", "payment");
  form.append("success_url", successUrl);
  form.append("cancel_url", cancelUrl);
  form.append("client_reference_id", orderId);
  form.append("customer_email", newOrder.customerEmail);
  form.append("metadata[type]", "storefront_order");
  form.append("metadata[orderId]", orderId);
  form.append("metadata[websiteId]", website.id);
  form.append("metadata[tenantId]", website.userId);
  form.append("metadata[expectedTotalMinor]", String(amountMinor));
  form.append("metadata[currency]", resolved.currency.toLowerCase());

  // Line items
  if (resolved.discountAmount > 0) {
    const itemNames = resolved.trustedItems.map((i) => `${i.quantity}x ${i.name}`).join(", ");
    form.append("line_items[0][price_data][currency]", resolved.currency.toLowerCase());
    form.append("line_items[0][price_data][product_data][name]", `Order #${orderId} (${itemNames})`.slice(0, 250));
    form.append("line_items[0][price_data][unit_amount]", String(amountMinor));
    form.append("line_items[0][quantity]", "1");
  } else {
    resolved.trustedItems.forEach((it, idx) => {
      form.append(`line_items[${idx}][price_data][currency]`, resolved.currency.toLowerCase());
      form.append(`line_items[${idx}][price_data][product_data][name]`, it.name.slice(0, 250));
      form.append(`line_items[${idx}][price_data][unit_amount]`, String(Math.round(it.unitPrice * 100)));
      form.append(`line_items[${idx}][quantity]`, String(it.quantity));
    });
    let extraIdx = resolved.trustedItems.length;
    if (resolved.shippingCost > 0) {
      form.append(`line_items[${extraIdx}][price_data][currency]`, resolved.currency.toLowerCase());
      form.append(`line_items[${extraIdx}][price_data][product_data][name]`, "Shipping");
      form.append(`line_items[${extraIdx}][price_data][unit_amount]`, String(Math.round(resolved.shippingCost * 100)));
      form.append(`line_items[${extraIdx}][quantity]`, "1");
      extraIdx++;
    }
    if (resolved.taxAmount > 0) {
      form.append(`line_items[${extraIdx}][price_data][currency]`, resolved.currency.toLowerCase());
      form.append(`line_items[${extraIdx}][price_data][product_data][name]`, "Taxes");
      form.append(`line_items[${extraIdx}][price_data][unit_amount]`, String(Math.round(resolved.taxAmount * 100)));
      form.append(`line_items[${extraIdx}][quantity]`, "1");
    }
  }

  // 5. Invoke Stripe Checkout API
  const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  const data = await resp.json().catch(() => null);

  if (!resp.ok || !data?.id || !data?.url) {
    const errMsg = data?.error?.message || `Payment gateway rejected checkout creation (${resp.status})`;
    throw new AppError(errMsg, 502, "CHECKOUT_CREATION_FAILED");
  }

  // 6. Associate Stripe session ID with order and persist in website editorData
  newOrder.stripeSessionId = data.id;
  const editorData: any = website.editorData || {};
  const existingOrders: Order[] = Array.isArray(editorData.commerceOrders) ? editorData.commerceOrders : [];
  const updatedOrders = [newOrder, ...existingOrders];

  await prisma.website.update({
    where: { id: website.id },
    data: {
      editorData: {
        ...editorData,
        commerceOrders: updatedOrders,
      },
    },
  });

  return {
    success: true,
    orderId,
    sessionId: data.id,
    checkoutUrl: data.url,
    total: resolved.total,
    currency: resolved.currency,
  };
}

// ---------------------------------------------------------------------------
// Storefront Payment Verification
// ---------------------------------------------------------------------------

/**
 * Authoritatively verifies a Stripe checkout session and marks order paid.
 * Protects against browser spoofing: orders are never marked paid without gateway verification.
 */
export async function verifyStorefrontPayment(
  websiteId: string,
  sessionId: string,
  orderId?: string
): Promise<{
  success: boolean;
  verified: boolean;
  paymentStatus: string;
  orderId?: string;
  order?: Order;
  message?: string;
}> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new AppError("Stripe payment gateway is not configured", 503, "PAYMENT_GATEWAY_NOT_CONFIGURED");
  }

  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) {
    throw new AppError("Website not found", 404, "WEBSITE_NOT_FOUND");
  }

  const editorData: any = website.editorData || {};
  const orders: Order[] = Array.isArray(editorData.commerceOrders) ? editorData.commerceOrders : [];

  let order = orders.find(
    (o) => (orderId && o.id === orderId) || (o.stripeSessionId && o.stripeSessionId === sessionId)
  );
  if (!order && orderId) {
    order = orders.find((o) => o.id === orderId);
  }
  if (!order) {
    throw new AppError(`Order not found for session '${sessionId}'`, 404, "ORDER_NOT_FOUND");
  }

  // Already marked paid
  if (order.paymentStatus === "paid") {
    return {
      success: true,
      verified: true,
      paymentStatus: "paid",
      orderId: order.id,
      order,
    };
  }

  // Query Stripe API
  const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const session = await resp.json().catch(() => null);

  if (!resp.ok || !session?.id) {
    const errMsg = session?.error?.message || `Failed to verify checkout session with payment gateway (${resp.status})`;
    throw new AppError(errMsg, 502, "SESSION_VERIFICATION_FAILED");
  }

  // Cross-tenant & website association check
  if (session.metadata?.websiteId && session.metadata.websiteId !== website.id) {
    throw new AppError("Session does not belong to this website", 403, "TENANT_MISMATCH");
  }

  if (session.metadata?.orderId && session.metadata.orderId !== order.id) {
    throw new AppError("Session does not match target order", 400, "ORDER_MISMATCH");
  }

  if (session.payment_status === "paid") {
    const expectedMinor = Math.round(order.total * 100);
    if (session.amount_total !== undefined && Number(session.amount_total) !== expectedMinor) {
      throw new AppError(
        `Payment amount mismatch: expected ${expectedMinor}, received ${session.amount_total}`,
        400,
        "AMOUNT_MISMATCH"
      );
    }

    const markResult = await markStorefrontOrderPaid(website.id, order.id, session);
    return {
      success: true,
      verified: true,
      paymentStatus: "paid",
      orderId: order.id,
      order: markResult.order,
    };
  }

  return {
    success: false,
    verified: false,
    paymentStatus: session.payment_status || "unpaid",
    orderId: order.id,
    message: `Payment status is ${session.payment_status || "unpaid"}`,
  };
}

// ---------------------------------------------------------------------------
// Storefront Webhook Handlers & Fulfillment
// ---------------------------------------------------------------------------

/**
 * Marks a storefront order as paid, adjusts stock, and increments coupon counts.
 * Prevents duplicate fulfillment if already paid.
 */
export async function markStorefrontOrderPaid(
  websiteId: string,
  orderId: string,
  session: any
): Promise<{ success: boolean; alreadyPaid: boolean; order: Order }> {
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) {
    throw new AppError(`Website '${websiteId}' not found`, 404, "WEBSITE_NOT_FOUND");
  }

  const editorData: any = website.editorData || {};
  const orders: Order[] = Array.isArray(editorData.commerceOrders) ? [...editorData.commerceOrders] : [];
  const orderIdx = orders.findIndex((o) => o.id === orderId);
  if (orderIdx === -1) {
    throw new AppError(`Order '${orderId}' not found on website '${websiteId}'`, 404, "ORDER_NOT_FOUND");
  }

  const existingOrder = orders[orderIdx];
  if (existingOrder.paymentStatus === "paid") {
    return { success: true, alreadyPaid: true, order: existingOrder };
  }

  // Amount & Currency verification
  const expectedMinor = Math.round(existingOrder.total * 100);
  if (session.amount_total !== undefined && Number(session.amount_total) !== expectedMinor) {
    throw new AppError(
      `Payment amount mismatch: expected ${expectedMinor}, received ${session.amount_total}`,
      400,
      "AMOUNT_MISMATCH"
    );
  }

  const sessionCurrency = (session.currency || "").toLowerCase();
  const orderCurrency = (existingOrder.currency || "USD").toLowerCase();
  if (sessionCurrency && sessionCurrency !== orderCurrency) {
    throw new AppError(
      `Payment currency mismatch: expected ${orderCurrency}, received ${sessionCurrency}`,
      400,
      "CURRENCY_MISMATCH"
    );
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || existingOrder.stripePaymentIntentId;

  const updatedOrder: Order = {
    ...existingOrder,
    status: "processing",
    paymentStatus: "paid",
    stripeSessionId: session.id || existingOrder.stripeSessionId,
    stripePaymentIntentId: paymentIntentId,
    paidAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders[orderIdx] = updatedOrder;

  // Inventory adjustment: decrement stock
  const products: CommerceProduct[] = Array.isArray(editorData.commerceProducts) ? [...editorData.commerceProducts] : [];
  if (products.length > 0) {
    for (const item of updatedOrder.items) {
      const prodIdx = products.findIndex((p) => p.id === item.productId || p.slug === item.productId);
      if (prodIdx > -1) {
        const prod = { ...products[prodIdx] };
        if (item.variantId && prod.variants) {
          const varIdx = prod.variants.findIndex((v) => v.id === item.variantId);
          if (varIdx > -1 && typeof prod.variants[varIdx].stock === "number") {
            const copyVariants = [...prod.variants];
            copyVariants[varIdx] = {
              ...copyVariants[varIdx],
              stock: Math.max(0, copyVariants[varIdx].stock - item.quantity),
            };
            prod.variants = copyVariants;
          }
        } else if (typeof prod.stock === "number") {
          prod.stock = Math.max(0, prod.stock - item.quantity);
        }
        products[prodIdx] = prod;
      }
    }
  }

  // Coupon usage increment
  const coupons: Coupon[] = Array.isArray(editorData.commerceCoupons) ? [...editorData.commerceCoupons] : [];
  if (updatedOrder.couponCode && coupons.length > 0) {
    const cIdx = coupons.findIndex((c) => c.code === updatedOrder.couponCode?.toUpperCase());
    if (cIdx > -1) {
      coupons[cIdx] = {
        ...coupons[cIdx],
        usageCount: (coupons[cIdx].usageCount || 0) + 1,
      };
    }
  }

  await prisma.website.update({
    where: { id: websiteId },
    data: {
      editorData: {
        ...editorData,
        commerceOrders: orders,
        commerceProducts: products.length > 0 ? products : editorData.commerceProducts,
        commerceCoupons: coupons.length > 0 ? coupons : editorData.commerceCoupons,
      },
    },
  });

  return { success: true, alreadyPaid: false, order: updatedOrder };
}

/**
 * Handles failed, expired, or canceled checkout sessions.
 * Never reverses an order that was already paid.
 */
export async function markStorefrontOrderFailed(
  websiteId: string,
  orderId: string,
  reason: string
): Promise<{ success: boolean; order?: Order }> {
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) return { success: false };

  const editorData: any = website.editorData || {};
  const orders: Order[] = Array.isArray(editorData.commerceOrders) ? [...editorData.commerceOrders] : [];
  const orderIdx = orders.findIndex((o) => o.id === orderId);
  if (orderIdx === -1) return { success: false };

  const order = orders[orderIdx];
  // Do not reverse paid/processing/completed order states
  if (order.paymentStatus === "paid" || order.status === "processing" || order.status === "completed") {
    return { success: true, order };
  }

  orders[orderIdx] = {
    ...order,
    status: "failed",
    paymentStatus: "failed",
    paymentFailureReason: reason,
    updatedAt: new Date().toISOString(),
  };

  await prisma.website.update({
    where: { id: websiteId },
    data: {
      editorData: {
        ...editorData,
        commerceOrders: orders,
      },
    },
  });

  return { success: true, order: orders[orderIdx] };
}
