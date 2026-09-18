/**
 * Phase 18: Commerce Controller
 * Manages per-website e-commerce settings, product catalog,
 * coupons, and WooCommerce export parity.
 */
import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import {
  validateProduct,
  validateCoupon,
  validateCommerceSettings,
  calculateCartTotals,
  isValidOrderTransition,
  getNextOrderStatuses,
  toWooCommercePayload,
  formatPrice,
  computeCouponDiscount,
  DEFAULT_COMMERCE_SETTINGS,
  type CommerceProduct,
  type Coupon,
  type CartItem,
  type OrderStatus,
} from "../services/ecommerce/commerce.service.js";

// ---------------------------------------------------------------------------
// Helper: verify user owns or collaborates on website
// ---------------------------------------------------------------------------
async function getAuthorizedWebsite(websiteId: string, userId?: string) {
  if (!websiteId) return null;
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) return null;
  if (userId && website.userId !== userId) {
    const collab = await (prisma as any).websiteCollaborator?.findFirst?.({
      where: { websiteId, userId },
    });
    if (!collab) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"].includes(user.role as string)) {
        return null;
      }
    }
  }
  return website;
}

// Helper to read and write commerce data within editorData
function readCommerceData(website: any) {
  const editorData: any = website.editorData || {};
  return {
    settings: editorData.commerceSettings || null,
    products: Array.isArray(editorData.commerceProducts) ? editorData.commerceProducts : [],
    coupons: Array.isArray(editorData.commerceCoupons) ? editorData.commerceCoupons : [],
    orders: Array.isArray(editorData.commerceOrders) ? editorData.commerceOrders : [],
  };
}

async function writeCommerceData(
  websiteId: string,
  website: any,
  patch: Partial<{ settings: any; products: any[]; coupons: any[]; orders: any[] }>
) {
  const editorData: any = website.editorData || {};
  const updated = {
    ...editorData,
    ...(patch.settings !== undefined ? { commerceSettings: patch.settings } : {}),
    ...(patch.products !== undefined ? { commerceProducts: patch.products } : {}),
    ...(patch.coupons !== undefined ? { commerceCoupons: patch.coupons } : {}),
    ...(patch.orders !== undefined ? { commerceOrders: patch.orders } : {}),
  };
  return prisma.website.update({ where: { id: websiteId }, data: { editorData: updated } });
}

// ---------------------------------------------------------------------------
// Commerce Settings
// ---------------------------------------------------------------------------

/** GET /api/websites/:websiteId/commerce/settings */
export async function getCommerceSettings(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const { settings } = readCommerceData(website);
    const resolved = validateCommerceSettings(settings || {});
    return res.status(200).json({ success: true, settings: resolved });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** PUT /api/websites/:websiteId/commerce/settings */
export async function updateCommerceSettings(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const validated = validateCommerceSettings(req.body);
    await writeCommerceData(websiteId, website, { settings: validated });
    return res.status(200).json({ success: true, message: "Commerce settings updated", settings: validated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/** GET /api/websites/:websiteId/commerce/products */
export async function listProducts(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const { products } = readCommerceData(website);
    return res.status(200).json({ success: true, products, total: products.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** POST /api/websites/:websiteId/commerce/products */
export async function createProduct(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const product = validateProduct(req.body);
    const { products } = readCommerceData(website);

    // Prevent duplicate IDs
    if (products.some((p: any) => p.id === product.id || p.slug === product.slug)) {
      return res.status(409).json({ success: false, message: "Product with this id/slug already exists" });
    }

    const updated = [...products, product];
    await writeCommerceData(websiteId, website, { products: updated });
    return res.status(201).json({ success: true, product });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/** PUT /api/websites/:websiteId/commerce/products/:productId */
export async function updateProduct(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const productId = String(req.params.productId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const { products } = readCommerceData(website);
    const idx = products.findIndex((p: any) => p.id === productId);
    if (idx === -1) return res.status(404).json({ success: false, message: "Product not found" });

    const merged = { ...products[idx], ...req.body, id: productId };
    const product = validateProduct(merged);
    products[idx] = product;

    await writeCommerceData(websiteId, website, { products });
    return res.status(200).json({ success: true, product });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/** DELETE /api/websites/:websiteId/commerce/products/:productId */
export async function deleteProduct(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const productId = String(req.params.productId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const { products } = readCommerceData(website);
    const filtered = products.filter((p: any) => p.id !== productId);
    if (filtered.length === products.length) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    await writeCommerceData(websiteId, website, { products: filtered });
    return res.status(200).json({ success: true, message: "Product deleted" });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

/** GET /api/websites/:websiteId/commerce/coupons */
export async function listCoupons(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const { coupons } = readCommerceData(website);
    return res.status(200).json({ success: true, coupons });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** POST /api/websites/:websiteId/commerce/coupons */
export async function createCoupon(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const coupon = validateCoupon(req.body);
    const { coupons } = readCommerceData(website);

    if (coupons.some((c: any) => c.code === coupon.code)) {
      return res.status(409).json({ success: false, message: "Coupon with this code already exists" });
    }

    await writeCommerceData(websiteId, website, { coupons: [...coupons, coupon] });
    return res.status(201).json({ success: true, coupon });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/** DELETE /api/websites/:websiteId/commerce/coupons/:code */
export async function deleteCoupon(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const code = String(req.params.code || "").toUpperCase();
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const { coupons } = readCommerceData(website);
    const filtered = coupons.filter((c: any) => c.code !== code);
    if (filtered.length === coupons.length) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    await writeCommerceData(websiteId, website, { coupons: filtered });
    return res.status(200).json({ success: true, message: "Coupon deleted" });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ---------------------------------------------------------------------------
// Cart Total Calculation
// ---------------------------------------------------------------------------

/** POST /api/websites/:websiteId/commerce/cart/calculate */
export async function calculateCart(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const website = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!website) return res.status(404).json({ success: false, message: "Website not found" });

    const { cart, couponCode } = req.body;
    if (!cart || !Array.isArray(cart.items)) {
      return res.status(400).json({ success: false, message: "cart.items array is required" });
    }

    const { settings: rawSettings, coupons } = readCommerceData(website);
    const settings = validateCommerceSettings(rawSettings || {});

    let coupon: Coupon | undefined;
    if (couponCode) {
      const found = coupons.find((c: any) => c.code === String(couponCode).toUpperCase());
      if (!found) return res.status(404).json({ success: false, message: "Coupon not found" });
      coupon = found;
    }

    const totals = calculateCartTotals(cart, settings, coupon);
    const formattedTotal = formatPrice(totals.total, settings);

    return res.status(200).json({ success: true, ...totals, formattedTotal, currency: settings.currency });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

// ---------------------------------------------------------------------------
// WooCommerce Export
// ---------------------------------------------------------------------------

/** GET /api/websites/:websiteId/commerce/wc-export */
export async function wcExport(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const { products, settings: rawSettings, coupons } = readCommerceData(website);
    const settings = validateCommerceSettings(rawSettings || {});

    const wcProducts = products.map((p: any) => toWooCommercePayload(p));
    const wcCoupons = coupons.map((c: Coupon) => ({
      code: c.code,
      discount_type: c.type,
      amount: String(c.amount),
      minimum_amount: c.minOrderAmount ? String(c.minOrderAmount) : "0",
      usage_limit: c.maxUsage || null,
      date_expires: c.expiresAt || null,
    }));

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="wc-export-${websiteId}.json"`);

    return res.status(200).json({
      exportedAt: new Date().toISOString(),
      currency: settings.currency,
      products: wcProducts,
      coupons: wcCoupons,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ---------------------------------------------------------------------------
// Orders (read/status-update only — creation happens via checkout)
// ---------------------------------------------------------------------------

/** GET /api/websites/:websiteId/commerce/orders */
export async function listOrders(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const { orders } = readCommerceData(website);
    return res.status(200).json({ success: true, orders, total: orders.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** PATCH /api/websites/:websiteId/commerce/orders/:orderId/status */
export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const orderId = String(req.params.orderId || "");
    const newStatus = String(req.body.status || "") as OrderStatus;
    const userId = res.locals.user?.id || (req as any).user?.id;

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const { orders } = readCommerceData(website);
    const idx = orders.findIndex((o: any) => o.id === orderId);
    if (idx === -1) return res.status(404).json({ success: false, message: "Order not found" });

    const order = orders[idx];
    if (!isValidOrderTransition(order.status, newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition order from '${order.status}' to '${newStatus}'`,
        allowedNext: getNextOrderStatuses(order.status),
      });
    }

    orders[idx] = { ...order, status: newStatus, updatedAt: new Date().toISOString() };
    await writeCommerceData(websiteId, website, { orders });

    return res.status(200).json({ success: true, order: orders[idx] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
