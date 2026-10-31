import React, { createContext, useContext, useState, useEffect } from "react";
import { type SiteProduct } from "../pages/editor/types";

export interface WcNotice {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  timestamp: number;
}

export interface WcCartItem {
  product: SiteProduct;
  quantity: number;
  selectedVariant?: string;
  selectedAddOns?: Record<string, any>;
  customPrice?: number;
}

export interface WcOrderReceipt {
  id: string;
  customerName: string;
  customerEmail: string;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  currency: string;
  paymentMethod: string;
  createdAt: string;
  status: string;
}

interface WooCommerceContextType {
  products: SiteProduct[];
  setProducts: React.Dispatch<React.SetStateAction<SiteProduct[]>>;
  cart: WcCartItem[];
  addToCart: (
    product: SiteProduct,
    quantity?: number,
    selectedAddOns?: Record<string, any>,
    customPrice?: number
  ) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  notices: WcNotice[];
  addNotice: (type: WcNotice["type"], message: string) => void;
  dismissNotice: (id: string) => void;
  activeShopLayout: "grid" | "list";
  setActiveShopLayout: (layout: "grid" | "list") => void;
  activeCategory: string | null;
  setActiveCategory: (cat: string | null) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  lastOrder: WcOrderReceipt | null;
  isCheckingOut?: boolean;
  placeOrder: (checkoutData: {
    customerName: string;
    customerEmail: string;
    billingAddress?: any;
    shippingAddress?: any;
    paymentMethod?: string;
    couponCode?: string;
  }) => Promise<WcOrderReceipt>;
}

const DEFAULT_PRODUCTS: SiteProduct[] = [
  {
    id: "wc-prod-101",
    name: "Aura Pro Wireless Headphones",
    price: "$199.99",
    regularPrice: "$249.99",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
    description: "Experience ultra-crisp active noise cancellation, 40-hour battery stamina, and custom-tuned acoustic drivers.",
    rating: 4.9,
    ratingCount: 142,
    badge: "Bestseller",
    category: "Audio & Sound",
    inStock: true,
  },
  {
    id: "wc-prod-102",
    name: "ChronoSync Smart Fitness Watch",
    price: "$149.50",
    regularPrice: "$179.00",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
    description: "Track vital stats, continuous heart rate, AMOLED display touch controls, and 50m water resistance.",
    rating: 4.7,
    ratingCount: 89,
    badge: "Sale",
    category: "Wearables",
    inStock: true,
  },
  {
    id: "wc-prod-103",
    name: "Vortex Hi-Fi Bluetooth Speaker",
    price: "$89.99",
    regularPrice: "$109.99",
    image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800",
    description: "360-degree room-filling acoustic bass, IPX7 waterproof casing, and seamless dual-pairing sync.",
    rating: 4.8,
    ratingCount: 64,
    badge: "Popular",
    category: "Audio & Sound",
    inStock: true,
  },
  {
    id: "wc-prod-104",
    name: "ErgoLift Aluminum Laptop Stand",
    price: "$49.99",
    regularPrice: "$59.99",
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800",
    description: "Precision CNC aluminum construction with ergonomic height adjustments and heat-dissipating airflow cutouts.",
    rating: 4.6,
    ratingCount: 53,
    category: "Accessories",
    inStock: true,
  },
];

const WooCommerceContext = createContext<WooCommerceContextType | undefined>(undefined);

export const WooCommerceProvider: React.FC<{
  children: React.ReactNode;
  initialProducts?: SiteProduct[];
  websiteId?: string;
}> = ({ children, initialProducts, websiteId }) => {
  const [products, setProducts] = useState<SiteProduct[]>(
    initialProducts && initialProducts.length > 0 ? initialProducts : DEFAULT_PRODUCTS
  );

  const [cart, setCart] = useState<WcCartItem[]>(() => {
    try {
      const saved = localStorage.getItem("fs_wc_cart");
      return saved ? JSON.parse(saved) : [
        { product: DEFAULT_PRODUCTS[0], quantity: 1 }
      ];
    } catch {
      return [{ product: DEFAULT_PRODUCTS[0], quantity: 1 }];
    }
  });

  const [notices, setNotices] = useState<WcNotice[]>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const checkoutParam = urlParams.get("checkout");
      const sessionId = urlParams.get("session_id");
      if (checkoutParam === "success" && sessionId) {
        return [
          {
            id: "wc-verify-notice",
            type: "info",
            message: "🔄 Verifying payment confirmation with payment gateway...",
            timestamp: Date.now(),
          },
        ];
      }
      if (checkoutParam === "cancel") {
        return [
          {
            id: "wc-cancel-notice",
            type: "warning",
            message: "Checkout was canceled. Your shopping cart has been preserved.",
            timestamp: Date.now(),
          },
        ];
      }
    }
    return [
      {
        id: "wc-init-notice",
        type: "info",
        message: "👋 Welcome to WooCommerce Store! Free shipping on all orders over $50.",
        timestamp: Date.now(),
      },
    ];
  });

  const [activeShopLayout, setActiveShopLayout] = useState<"grid" | "list">("grid");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<WcOrderReceipt | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);

  const addNotice = (type: WcNotice["type"], message: string) => {
    const newNotice: WcNotice = {
      id: "wc-notif-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      type,
      message,
      timestamp: Date.now(),
    };
    setNotices((prev) => [newNotice, ...prev.slice(0, 4)]);
  };

  const clearCart = () => {
    setCart([]);
  };

  // Return verification for Stripe Checkout redirect
  useEffect(() => {
    if (typeof window === "undefined" || !websiteId) return;
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutParam = urlParams.get("checkout");
    const sessionId = urlParams.get("session_id");
    const orderId = urlParams.get("order_id");

    if (checkoutParam === "success" && sessionId) {
      fetch(
        `/api/websites/${websiteId}/commerce/checkout-session/${encodeURIComponent(sessionId)}/verify?orderId=${encodeURIComponent(orderId || "")}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && (data.verified || data.paymentStatus === "paid")) {
            clearCart();
            const verifiedOrder = data.order || {};
            const receipt: WcOrderReceipt = {
              id: verifiedOrder.id || orderId || "WC-ORD-PAID",
              customerName: verifiedOrder.customerName || "Valued Customer",
              customerEmail: verifiedOrder.customerEmail || "",
              items: (verifiedOrder.items || []).map((it: any) => ({
                name: it.name,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                total: it.unitPrice * it.quantity,
              })),
              subtotal: verifiedOrder.subtotal || 0,
              taxAmount: verifiedOrder.taxAmount || 0,
              shippingCost: verifiedOrder.shippingCost || 0,
              total: verifiedOrder.total || 0,
              currency: verifiedOrder.currency || "USD",
              paymentMethod: "Stripe Checkout",
              createdAt: verifiedOrder.createdAt || new Date().toISOString(),
              status: "Processing",
            };
            setLastOrder(receipt);
            addNotice("success", `✅ Payment confirmed! Order #${receipt.id} placed successfully.`);
          } else {
            addNotice(
              "error",
              data?.message || "Payment confirmation could not be verified by Stripe. Your cart has been preserved."
            );
          }
        })
        .catch((err) => {
          console.error("Payment verification error:", err);
          addNotice("error", "Error communicating with payment gateway. Your cart has been preserved.");
        })
        .finally(() => {
          // Clean query parameters from address bar without reloading
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        });
    } else if (checkoutParam === "cancel") {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [websiteId]);

  // Live remote product catalog sync from backend commerce endpoint
  useEffect(() => {
    let isMounted = true;
    if (websiteId) {
      fetch(`/api/websites/${websiteId}/commerce/products`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data && Array.isArray(data.products) && data.products.length > 0) {
            setProducts(data.products.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: typeof p.price === "number" ? `$${p.price.toFixed(2)}` : String(p.price || "$0.00"),
              regularPrice: p.salePrice ? (typeof p.salePrice === "number" ? `$${p.salePrice.toFixed(2)}` : String(p.salePrice)) : undefined,
              image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : (p.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"),
              description: p.description || "",
              rating: p.rating || 5,
              ratingCount: p.ratingCount || 10,
              badge: p.badge,
              category: Array.isArray(p.categories) && p.categories.length > 0 ? p.categories[0] : (p.category || "General"),
              inStock: p.stock === "unlimited" || (typeof p.stock === "number" && p.stock > 0),
            })));
          }
        })
        .catch((err) => {
          console.warn("Could not fetch remote commerce products, falling back to default catalog", err);
        });
    }
    return () => { isMounted = false; };
  }, [websiteId]);

  useEffect(() => {
    try {
      localStorage.setItem("fs_wc_cart", JSON.stringify(cart));
    } catch (e) {
      console.warn("Could not persist WooCommerce cart", e);
    }
  }, [cart]);

  const dismissNotice = (id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  };

  const addToCart = (
    product: SiteProduct,
    quantity = 1,
    selectedAddOns?: Record<string, any>,
    customPrice?: number
  ) => {
    setCart((prev) => {
      const addOnsKey = selectedAddOns ? JSON.stringify(selectedAddOns) : "";
      const existingIdx = prev.findIndex((item) => {
        const itemAddOnsKey = item.selectedAddOns ? JSON.stringify(item.selectedAddOns) : "";
        return item.product.id === product.id && itemAddOnsKey === addOnsKey;
      });

      if (existingIdx > -1) {
        const copy = [...prev];
        copy[existingIdx].quantity += quantity;
        if (customPrice !== undefined) copy[existingIdx].customPrice = customPrice;
        return copy;
      }
      return [...prev, { product, quantity, selectedAddOns, customPrice }];
    });
    const addOnNotice = selectedAddOns && Object.keys(selectedAddOns).length > 0 ? " (with custom add-ons)" : "";
    addNotice("success", `🛒 Added "${product.name}"${addOnNotice} (${quantity}) to your shopping cart!`);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === productId);
      if (item) {
        addNotice("info", `🗑️ Removed "${item.product.name}" from cart.`);
      }
      return prev.filter((i) => i.product.id !== productId);
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const parsePriceNum = (priceStr?: string): number => {
    if (!priceStr) return 0;
    const cleaned = priceStr.replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => {
    const price = item.customPrice ?? parsePriceNum(item.product.price);
    return sum + price * item.quantity;
  }, 0);

  const placeOrder = async (checkoutData: {
    customerName: string;
    customerEmail: string;
    billingAddress?: any;
    shippingAddress?: any;
    paymentMethod?: string;
    couponCode?: string;
  }): Promise<WcOrderReceipt> => {
    if (!cart || cart.length === 0) {
      addNotice("error", "Your shopping cart is empty.");
      throw new Error("Cart is empty");
    }

    if (!websiteId) {
      addNotice("error", "Website identifier is missing for checkout.");
      throw new Error("Missing websiteId");
    }

    setIsCheckingOut(true);
    addNotice("info", "Initiating secure Stripe Checkout...");

    try {
      const res = await fetch(`/api/websites/${websiteId}/commerce/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: checkoutData.customerName,
          customerEmail: checkoutData.customerEmail,
          billingAddress: checkoutData.billingAddress,
          shippingAddress: checkoutData.shippingAddress,
          paymentMethod: checkoutData.paymentMethod || "stripe",
          couponCode: checkoutData.couponCode,
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            variantId: i.selectedVariant,
          })),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success || !data?.checkoutUrl) {
        const errorMsg =
          data?.message ||
          (res.status === 503
            ? "Stripe payment gateway is not configured"
            : "Payment gateway checkout session could not be created");
        addNotice("error", `❌ ${errorMsg}`);
        setIsCheckingOut(false);
        throw new Error(errorMsg);
      }

      // DO NOT clear cart here — cart is preserved until verified payment confirmation!
      // Redirect to Stripe Checkout URL
      window.location.href = data.checkoutUrl;

      const pendingOrder: WcOrderReceipt = {
        id: data.orderId || "WC-ORD-PENDING",
        customerName: checkoutData.customerName || "Valued Customer",
        customerEmail: checkoutData.customerEmail || "",
        items: cart.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          unitPrice: parsePriceNum(i.product.price),
          total: parsePriceNum(i.product.price) * i.quantity,
        })),
        subtotal: data.total || cartSubtotal,
        taxAmount: 0,
        shippingCost: 0,
        total: data.total || cartSubtotal,
        currency: data.currency || "USD",
        paymentMethod: "Stripe",
        createdAt: new Date().toISOString(),
        status: "Pending Payment",
      };

      return pendingOrder;
    } catch (err: any) {
      setIsCheckingOut(false);
      throw err;
    }
  };

  return (
    <WooCommerceContext.Provider
      value={{
        products,
        setProducts,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
        notices,
        addNotice,
        dismissNotice,
        activeShopLayout,
        setActiveShopLayout,
        activeCategory,
        setActiveCategory,
        selectedProductId,
        setSelectedProductId,
        lastOrder,
        isCheckingOut,
        placeOrder,
      }}
    >
      {children}
    </WooCommerceContext.Provider>
  );
};

export const useWooCommerce = () => {
  const context = useContext(WooCommerceContext);
  if (!context) {
    // Fallback stub for out-of-context rendering
    return {
      products: DEFAULT_PRODUCTS,
      setProducts: () => {},
      cart: [{ product: DEFAULT_PRODUCTS[0], quantity: 1 }],
      addToCart: () => {},
      removeFromCart: () => {},
      updateCartQuantity: () => {},
      clearCart: () => {},
      cartCount: 1,
      cartSubtotal: 199.99,
      notices: [],
      addNotice: () => {},
      dismissNotice: () => {},
      activeShopLayout: "grid" as const,
      setActiveShopLayout: () => {},
      activeCategory: null,
      setActiveCategory: () => {},
      selectedProductId: null,
      setSelectedProductId: () => {},
      lastOrder: null,
      placeOrder: async () => ({
        id: "WC-ORD-98421",
        customerName: "Sample Customer",
        customerEmail: "sample@example.com",
        items: [{ name: "Aura Pro Wireless Headphones", quantity: 1, unitPrice: 199.99, total: 199.99 }],
        subtotal: 199.99,
        taxAmount: 16.00,
        shippingCost: 0,
        total: 215.99,
        currency: "USD",
        paymentMethod: "Credit Card",
        createdAt: new Date().toISOString(),
        status: "Processing",
      }),
    };
  }
  return context;
};
