/**
 * Phase 18: Commerce Routes
 * Mounts all e-commerce endpoints under /api/websites/:websiteId/commerce/
 */
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getCommerceSettings,
  updateCommerceSettings,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listCoupons,
  createCoupon,
  deleteCoupon,
  calculateCart,
  wcExport,
  listOrders,
  createOrder,
  updateOrderStatus,
} from "../controllers/commerce.controller.js";

const router = Router({ mergeParams: true });

// Commerce Settings
router.get("/:websiteId/commerce/settings", requireAuth, getCommerceSettings);
router.put("/:websiteId/commerce/settings", requireAuth, updateCommerceSettings);

// Products
router.get("/:websiteId/commerce/products", requireAuth, listProducts);
router.post("/:websiteId/commerce/products", requireAuth, createProduct);
router.put("/:websiteId/commerce/products/:productId", requireAuth, updateProduct);
router.delete("/:websiteId/commerce/products/:productId", requireAuth, deleteProduct);

// Coupons
router.get("/:websiteId/commerce/coupons", requireAuth, listCoupons);
router.post("/:websiteId/commerce/coupons", requireAuth, createCoupon);
router.delete("/:websiteId/commerce/coupons/:code", requireAuth, deleteCoupon);

// Cart calculation (public — for storefront checkout)
router.post("/:websiteId/commerce/cart/calculate", calculateCart);

// WooCommerce export
router.get("/:websiteId/commerce/wc-export", requireAuth, wcExport);

// Orders
router.get("/:websiteId/commerce/orders", requireAuth, listOrders);
router.post("/:websiteId/commerce/orders", createOrder);
router.patch("/:websiteId/commerce/orders/:orderId/status", requireAuth, updateOrderStatus);

export default router;
