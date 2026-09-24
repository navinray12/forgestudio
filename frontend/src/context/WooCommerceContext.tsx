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
  addToCart: (product: SiteProduct, quantity?: number) => void;
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
  placeOrder: (checkoutData: {
    customerName: string;
    customerEmail: string;
    billingAddress?: any;
    paymentMethod?: string;
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
}> = ({ children, initialProducts }) => {
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

  const [notices, setNotices] = useState<WcNotice[]>([
    {
      id: "wc-init-notice",
      type: "info",
      message: "👋 Welcome to WooCommerce Store! Free shipping on all orders over $50.",
      timestamp: Date.now(),
    }
  ]);

  const [activeShopLayout, setActiveShopLayout] = useState<"grid" | "list">("grid");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<WcOrderReceipt | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("fs_wc_cart", JSON.stringify(cart));
    } catch (e) {
      console.warn("Could not persist WooCommerce cart", e);
    }
  }, [cart]);

  const addNotice = (type: WcNotice["type"], message: string) => {
    const newNotice: WcNotice = {
      id: "wc-notif-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      type,
      message,
      timestamp: Date.now(),
    };
    setNotices((prev) => [newNotice, ...prev.slice(0, 4)]);
  };

  const dismissNotice = (id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  };

  const addToCart = (product: SiteProduct, quantity = 1) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id);
      if (existingIdx > -1) {
        const copy = [...prev];
        copy[existingIdx].quantity += quantity;
        return copy;
      }
      return [...prev, { product, quantity }];
    });
    addNotice("success", `🛒 Added "${product.name}" (${quantity}) to your shopping cart!`);
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

  const clearCart = () => {
    setCart([]);
  };

  const parsePriceNum = (priceStr?: string): number => {
    if (!priceStr) return 0;
    const cleaned = priceStr.replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + parsePriceNum(item.product.price) * item.quantity, 0);

  const placeOrder = async (checkoutData: {
    customerName: string;
    customerEmail: string;
    billingAddress?: any;
    paymentMethod?: string;
  }): Promise<WcOrderReceipt> => {
    const orderItems = cart.map((i) => {
      const unitPrice = parsePriceNum(i.product.price);
      return {
        name: i.product.name,
        quantity: i.quantity,
        unitPrice,
        total: unitPrice * i.quantity,
      };
    });

    const subtotal = orderItems.reduce((acc, i) => acc + i.total, 0);
    const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
    const shippingCost = subtotal > 50 ? 0 : 9.99;
    const grandTotal = Math.round((subtotal + taxAmount + shippingCost) * 100) / 100;

    const newOrder: WcOrderReceipt = {
      id: "WC-ORD-" + Math.floor(100000 + Math.random() * 900000),
      customerName: checkoutData.customerName || "Valued Customer",
      customerEmail: checkoutData.customerEmail || "customer@example.com",
      items: orderItems,
      subtotal,
      taxAmount,
      shippingCost,
      total: grandTotal,
      currency: "USD",
      paymentMethod: checkoutData.paymentMethod || "Credit Card",
      createdAt: new Date().toISOString(),
      status: "Processing",
    };

    setLastOrder(newOrder);
    clearCart();
    addNotice("success", `✅ Order #${newOrder.id} successfully placed! Summary updated.`);
    return newOrder;
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
