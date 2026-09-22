import type { SiteProduct, EditorElement, SiteWooCommerceSettings } from "../types";

export const DEFAULT_WOO_SETTINGS: SiteWooCommerceSettings = {
  currency: "USD",
  currencySymbol: "$",
  currencyPosition: "prefix",
  thousandSeparator: ",",
  decimalSeparator: ".",
  numDecimals: 2,
  calcTaxes: true,
  taxDisplayShop: "excl",
  lowStockThreshold: 5,
  outOfStockVisibility: true,
  cartRedirectAfterAdd: false,
  enableGuestCheckout: true
};

export const DEFAULT_SITE_PRODUCTS: SiteProduct[] = [
  {
    id: "prod_1",
    name: "Premium Noise-Canceling Wireless Headphones",
    price: "$199.99",
    regularPrice: "$249.99",
    salePrice: "$199.99",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80",
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80"
    ],
    rating: 5,
    ratingCount: 128,
    category: "Electronics",
    categories: ["Electronics", "Audio", "Wireless"],
    tags: ["bluetooth", "audio", "noise-canceling"],
    inStock: true,
    stockQuantity: 45,
    sku: "AUD-HD-001",
    badge: "SALE",
    url: "#product-headphones",
    shortDescription: "Experience immersive studio-quality sound with active noise cancellation and 30-hour battery life.",
    description: "Designed for audiophiles and travelers, our Premium Wireless Headphones feature high-res audio drivers, plush memory foam ear cushions, seamlessly intuitive touch gesture controls, and quick USB-C charging.",
    attributes: {
      "Connectivity": "Bluetooth 5.2 & 3.5mm Aux",
      "Battery Life": "30 Hours (ANC On)",
      "Warranty": "2 Years Manufacturer Warranty",
      "Weight": "250 grams"
    },
    relatedProductIds: ["prod_2", "prod_4"],
    upsellProductIds: ["prod_5"]
  },
  {
    id: "prod_2",
    name: "Ergonomic Smart Watch Series X",
    price: "$149.00",
    regularPrice: "$179.00",
    salePrice: "$149.00",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
      "https://images.unsplash.com/photo-1510017803434-a899398421b3?w=800&q=80"
    ],
    rating: 4.8,
    ratingCount: 94,
    category: "Wearables",
    categories: ["Wearables", "Smart Tech", "Fitness"],
    tags: ["health", "smartwatch", "fitness"],
    inStock: true,
    stockQuantity: 18,
    sku: "WRB-SW-002",
    badge: "POPULAR",
    url: "#product-watch",
    shortDescription: "Track your health metrics, heart rate, sleep quality, and daily activities on a crystal-clear AMOLED display.",
    description: "The Smart Watch Series X combines sleek minimalist design with advanced biometric monitoring. Water-resistant up to 50m with seamless smartphone notifications.",
    attributes: {
      "Display": "1.4-inch AMOLED Touchscreen",
      "Water Resistance": "5 ATM (50m)",
      "Sensors": "Optical Heart Rate, SpO2, Accelerometer"
    },
    relatedProductIds: ["prod_1", "prod_3"],
    upsellProductIds: ["prod_1"]
  },
  {
    id: "prod_3",
    name: "Ultralight Pro Running Sneakers",
    price: "$129.50",
    regularPrice: "$149.99",
    salePrice: "$129.50",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80"
    ],
    rating: 4.7,
    ratingCount: 76,
    category: "Footwear",
    categories: ["Footwear", "Apparel", "Sports"],
    tags: ["running", "shoes", "fitness"],
    inStock: true,
    stockQuantity: 30,
    sku: "FTW-SNK-003",
    badge: "BESTSELLER",
    url: "#product-sneakers",
    shortDescription: "Engineered responsive cushioning designed for maximum comfort and speed during daily runs.",
    description: "Breathable mesh upper with carbon-fiber spring plate technology gives you endless energy return step after step.",
    attributes: {
      "Sole Material": "High-grip rubber compound",
      "Closure": "Lace-up precision fit",
      "Weight": "210 grams per shoe"
    },
    relatedProductIds: ["prod_2", "prod_4"],
    upsellProductIds: ["prod_1"]
  },
  {
    id: "prod_4",
    name: "Waterproof Commuter Backpack 25L",
    price: "$89.00",
    regularPrice: "$110.00",
    salePrice: "$89.00",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80"
    ],
    rating: 4.9,
    ratingCount: 52,
    category: "Accessories",
    categories: ["Accessories", "Travel", "Bags"],
    tags: ["backpack", "waterproof", "commuter"],
    inStock: true,
    stockQuantity: 60,
    sku: "BAG-BP-004",
    url: "#product-backpack",
    shortDescription: "Durable weatherproof laptop bag featuring anti-theft hidden pockets and ergonomic shoulder straps.",
    description: "Ideal for daily office commutes or weekend travel, fits up to 16-inch laptops with padded shockproof compartments.",
    attributes: {
      "Capacity": "25 Liters",
      "Material": "1000D Cordura Nylon",
      "Laptop Pocket": "Fits up to 16-inch MacBook Pro"
    },
    relatedProductIds: ["prod_1", "prod_2"],
    upsellProductIds: ["prod_5"]
  },
  {
    id: "prod_5",
    name: "4K Cinema Studio Camera Bundle",
    price: "$1,299.00",
    regularPrice: "$1,499.00",
    salePrice: "$1,299.00",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80"
    ],
    rating: 5,
    ratingCount: 38,
    category: "Electronics",
    categories: ["Electronics", "Cameras", "Video"],
    tags: ["camera", "4k", "cinema"],
    inStock: true,
    stockQuantity: 8,
    sku: "CAM-4K-005",
    badge: "PREMIUM",
    url: "#product-camera",
    shortDescription: "Professional full-frame 4K mirrorless camera kit with 24-70mm f/2.8 lens and tripod bundle.",
    description: "Capture stunning 4K60p video and 30MP static photos with dual pixel autofocus and 5-axis IBIS stabilization.",
    attributes: {
      "Sensor": "30.4MP Full-Frame CMOS",
      "Video Resolution": "4K UHD up to 60fps",
      "ISO Range": "100-32000"
    },
    relatedProductIds: ["prod_1", "prod_4"],
    upsellProductIds: ["prod_1"]
  }
];

export class WooCommerceService {
  /**
   * Returns current product list or defaults
   */
  static getProducts(customProducts?: SiteProduct[]): SiteProduct[] {
    if (customProducts && customProducts.length > 0) {
      return customProducts;
    }
    return DEFAULT_SITE_PRODUCTS;
  }

  private static productCache = new Map<string, SiteProduct>();

  /**
   * Finds a product by ID without fallback
   */
  static findProduct(productId?: string, products?: SiteProduct[]): SiteProduct | undefined {
    if (!productId) return undefined;
    const list = this.getProducts(products);
    return list.find((p) => p.id === productId);
  }

  /**
   * Finds a product by ID, falling back to the first available product or a clean default object
   */
  static getProductById(productId?: string, products?: SiteProduct[]): SiteProduct {
    const found = this.findProduct(productId, products);
    if (found) return found;
    const list = this.getProducts(products);
    return list[0] || DEFAULT_SITE_PRODUCTS[0];
  }

  /**
   * Async API Abstraction to fetch product data with caching & graceful fallbacks
   */
  static async fetchProductById(productId: string, siteProducts?: SiteProduct[]): Promise<{ product?: SiteProduct; error?: string }> {
    if (!productId) {
      return { error: "Invalid product ID requested" };
    }

    if (this.productCache.has(productId)) {
      return { product: this.productCache.get(productId) };
    }

    const localProduct = this.findProduct(productId, siteProducts);
    if (localProduct) {
      this.productCache.set(productId, localProduct);
      return { product: localProduct };
    }

    try {
      // API client attempt (fails gracefully to local list if backend route unpopulated)
      const res = await fetch(`/api/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          this.productCache.set(productId, data);
          return { product: data };
        }
      }
    } catch (err: any) {
      console.warn(`[WooCommerceService] API fetch failed for product ${productId}, using catalog fallback:`, err.message);
    }

    const fallback = this.getProductById(productId, siteProducts);
    return { product: fallback };
  }

  /**
   * Helper to format price string safely with currency symbol & position
   */
  static formatPrice(
    priceVal?: string | number,
    customSymbol?: string,
    customPosition?: "prefix" | "suffix"
  ): string {
    if (priceVal === undefined || priceVal === null || priceVal === "") return "$0.00";

    const symbol = customSymbol || "$";
    const position = customPosition || "prefix";

    if (typeof priceVal === "number") {
      const formattedNum = priceVal.toFixed(2);
      return position === "suffix" ? `${formattedNum}${symbol}` : `${symbol}${formattedNum}`;
    }

    const str = String(priceVal).trim();
    if (!str) return `${symbol}0.00`;

    if (str.startsWith("$") || str.startsWith("₹") || str.startsWith("€") || str.startsWith("£")) {
      if (customSymbol && customSymbol !== str[0]) {
        const rawNum = str.replace(/[^0-9.]/g, "");
        return position === "suffix" ? `${rawNum}${symbol}` : `${symbol}${rawNum}`;
      }
      return str;
    }

    const rawNum = parseFloat(str.replace(/[^0-9.]/g, ""));
    if (isNaN(rawNum)) return str;

    const formatted = rawNum.toFixed(2);
    return position === "suffix" ? `${formatted}${symbol}` : `${symbol}${formatted}`;
  }

  /**
   * Helper to parse numeric value from price string or number
   */
  static parsePriceNumber(priceVal?: string | number): number {
    if (typeof priceVal === "number") return priceVal;
    if (!priceVal) return 0;
    const num = parseFloat(String(priceVal).replace(/[^0-9.]/g, ""));
    return isNaN(num) ? 0 : num;
  }

  /**
   * Helper to compute discount percentage
   */
  static calculateDiscountPercentage(regularPriceVal?: string | number, salePriceVal?: string | number): number {
    const reg = this.parsePriceNumber(regularPriceVal);
    const sale = this.parsePriceNumber(salePriceVal);
    if (reg <= 0 || sale <= 0 || sale >= reg) return 0;
    return Math.round(((reg - sale) / reg) * 100);
  }

  /**
   * Resolves element parameters dynamically from either connected product catalog or element props
   */
  static resolveWooElementData(el: EditorElement, siteProducts?: SiteProduct[]) {
    const list = this.getProducts(siteProducts);
    const requestedId = el.productId;
    const found = requestedId ? list.find((p) => p.id === requestedId) : undefined;

    // Determine product not found state
    const isNotFound = el.productSource === "site" && Boolean(requestedId) && !found;
    const isLoading = Boolean(el.isLoadingProduct);
    const error = el.productError || (isNotFound ? `Product with ID "${requestedId}" was not found in the store catalog.` : undefined);

    const prod = found || list[0] || DEFAULT_SITE_PRODUCTS[0];

    // Resolve dynamic values with fallbacks to manual/overridden content
    const title = (el.productSource === "manual" && el.wooProductTitle)
      ? el.wooProductTitle
      : (el.content && !el.content.startsWith("http") && !el.content.startsWith("blob:") ? el.content : prod.name);

    const price = (el.productSource === "manual" && el.wooPrice)
      ? el.wooPrice
      : prod.price;

    const regularPrice = prod.regularPrice || price;
    const salePrice = prod.salePrice || (prod.regularPrice && prod.price !== prod.regularPrice ? prod.price : undefined);
    const isOnSale = Boolean(salePrice || (prod.regularPrice && prod.price !== prod.regularPrice));
    const discountPercentage = this.calculateDiscountPercentage(regularPrice, salePrice || price);

    const formattedPrice = this.formatPrice(price, el.priceCurrencySymbol, el.priceCurrencyPosition);
    const formattedRegularPrice = this.formatPrice(regularPrice, el.priceCurrencySymbol, el.priceCurrencyPosition);
    const formattedSalePrice = salePrice ? this.formatPrice(salePrice, el.priceCurrencySymbol, el.priceCurrencyPosition) : undefined;

    const image = (el.productSource === "manual" && (el.src || el.productImage))
      ? (el.src || el.productImage || prod.image)
      : (prod.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600");

    const galleryImages = prod.galleryImages && prod.galleryImages.length > 0
      ? prod.galleryImages
      : [image];

    const rating = el.wooRating !== undefined ? el.wooRating : (prod.rating || 5);
    const ratingCount = prod.ratingCount || 42;
    const category = prod.category || "General";
    const categories = prod.categories || [category];
    const tags = prod.tags || ["ecommerce", "store"];
    const inStock = prod.inStock ?? true;
    const stockQuantity = prod.stockQuantity ?? 25;
    const sku = prod.sku || "SKU-WC-1001";
    const shortDescription = prod.shortDescription || "High quality e-commerce product available in store.";
    const description = prod.description || "Detailed product specification and features breakdown for online store items.";
    const attributes = prod.attributes || { "Color": "Black", "Warranty": "1 Year" };

    // Layout configuration resolution
    const layoutDirection = el.productLayoutDirection || "vertical";
    const imagePosition = el.productImagePosition || "top";
    const imageWidth = el.productImageWidth || "100%";
    const gap = el.productGap || "16px";
    const alignment = el.productAlignment || "start";

    // Display toggle resolution (defaulting to true)
    const showTitle = el.productShowTitle !== false;
    const showImage = el.productShowImage !== false;
    const showPrice = el.productShowPrice !== false;
    const showRating = el.productShowRating !== false;
    const showStock = el.productShowStock !== false;
    const showShortDesc = el.productShowShortDesc !== false;
    const showAddToCart = el.productShowAddToCart !== false;
    const showMeta = el.productShowMeta !== false;
    const showBadge = el.productShowBadge !== false;

    return {
      product: prod,
      isNotFound,
      isLoading,
      error,
      title,
      price,
      regularPrice,
      salePrice,
      isOnSale,
      discountPercentage,
      formattedPrice,
      formattedRegularPrice,
      formattedSalePrice,
      image,
      galleryImages,
      rating,
      ratingCount,
      category,
      categories,
      tags,
      inStock,
      stockQuantity,
      sku,
      shortDescription,
      description,
      attributes,
      badge: prod.badge,
      // Layout & Display
      layoutDirection,
      imagePosition,
      imageWidth,
      gap,
      alignment,
      showTitle,
      showImage,
      showPrice,
      showRating,
      showStock,
      showShortDesc,
      showAddToCart,
      showMeta,
      showBadge
    };
  }

  /**
   * Utility to format star icons string
   */
  static renderStarRating(rating: number): string {
    const stars = Math.max(0, Math.min(5, Math.round(rating || 0)));
    return "★".repeat(stars) + "☆".repeat(5 - stars);
  }

  /**
   * Utility to format star rating details with full, half, and empty counts
   */
  static getStarRatingDetails(rating: number, maxStars: number = 5) {
    const validRating = Math.max(0, Math.min(maxStars, isNaN(rating) ? 0 : rating));
    const full = Math.floor(validRating);
    const decimal = validRating - full;
    const hasHalf = decimal >= 0.25 && decimal < 0.75;
    const isRoundedUp = decimal >= 0.75;
    const finalFull = isRoundedUp ? full + 1 : full;
    const finalHalf = hasHalf ? 1 : 0;
    const empty = Math.max(0, maxStars - finalFull - finalHalf);

    return {
      full: finalFull,
      half: finalHalf,
      empty,
      ratingValue: validRating
    };
  }

  // ==========================================
  // F-297 Cart State Management Architecture
  // ==========================================
  private static cartListeners = new Set<() => void>();

  /**
   * Reads cart from localStorage safely
   */
  static loadCartFromStorage(): any[] {
    try {
      if (typeof window === "undefined") return [];
      const saved = localStorage.getItem("forgestudio_wc_cart");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("[WooCommerceService] Failed to load cart from localStorage:", e);
      return [];
    }
  }

  /**
   * Persists cart to localStorage safely
   */
  static saveCartToStorage(items: any[]): void {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem("forgestudio_wc_cart", JSON.stringify(items));
    } catch (e) {
      console.warn("[WooCommerceService] Failed to save cart to localStorage:", e);
    }
  }

  /**
   * Subscribe to cart state changes
   */
  static subscribeCart(callback: () => void): () => void {
    this.cartListeners.add(callback);
    return () => {
      this.cartListeners.delete(callback);
    };
  }

  /**
   * Notify all subscribed cart listeners
   */
  static notifyCartListeners(): void {
    this.cartListeners.forEach((cb) => {
      try { cb(); } catch (err) { console.error(err); }
    });
  }

  /**
   * Calculates overall cart totals, item counts, and formatted values
   */
  static getCartState(siteProducts?: SiteProduct[]): { items: any[]; totalQuantity: number; subtotal: number; formattedSubtotal: string } {
    const items = this.loadCartFromStorage();
    let totalQuantity = 0;
    let subtotal = 0;

    items.forEach((item) => {
      totalQuantity += item.quantity || 1;
      subtotal += (item.priceNumber || 0) * (item.quantity || 1);
    });

    const formattedSubtotal = this.formatPrice(subtotal);

    return {
      items,
      totalQuantity,
      subtotal,
      formattedSubtotal
    };
  }

  /**
   * Authoritative Add to Cart method
   * Ensures price and availability are validated from backend/catalog
   */
  static addToCart(
    productId: string,
    quantity: number = 1,
    variation?: Record<string, string>,
    siteProducts?: SiteProduct[]
  ): { success: boolean; item?: any; cart?: any; error?: string } {
    if (!productId) {
      return { success: false, error: "Invalid product identifier." };
    }

    const prod = this.getProductById(productId, siteProducts);
    if (!prod) {
      return { success: false, error: `Product "${productId}" does not exist.` };
    }

    if (prod.inStock === false) {
      return { success: false, error: `"${prod.name}" is currently out of stock.` };
    }

    const validQty = Math.max(1, Math.min(quantity, prod.stockQuantity || 99));

    // Authoritative price resolution
    const authoritativePriceStr = prod.salePrice || prod.price;
    const priceNum = this.parsePriceNumber(authoritativePriceStr);
    const formattedPrice = this.formatPrice(authoritativePriceStr);

    const items = this.loadCartFromStorage();
    const existingIdx = items.findIndex((i) => i.productId === prod.id);

    let updatedItem: any;

    if (existingIdx >= 0) {
      items[existingIdx].quantity = (items[existingIdx].quantity || 1) + validQty;
      updatedItem = items[existingIdx];
    } else {
      updatedItem = {
        id: `cart_item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: prod.id,
        name: prod.name,
        price: formattedPrice,
        priceNumber: priceNum,
        image: prod.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
        quantity: validQty,
        variation: variation || {}
      };
      items.push(updatedItem);
    }

    this.saveCartToStorage(items);
    this.notifyCartListeners();

    const cartState = this.getCartState(siteProducts);

    return {
      success: true,
      item: updatedItem,
      cart: cartState
    };
  }

  /**
   * Removes an item from the cart by cart item ID or product ID
   */
  static removeFromCart(cartItemId: string): void {
    const items = this.loadCartFromStorage().filter((i) => i.id !== cartItemId && i.productId !== cartItemId);
    this.saveCartToStorage(items);
    this.notifyCartListeners();
  }

  /**
   * Updates cart item quantity
   */
  static updateCartItemQuantity(cartItemId: string, quantity: number): void {
    const items = this.loadCartFromStorage();
    const item = items.find((i) => i.id === cartItemId || i.productId === cartItemId);
    if (item) {
      if (quantity <= 0) {
        this.removeFromCart(cartItemId);
        return;
      }
      item.quantity = quantity;
      this.saveCartToStorage(items);
      this.notifyCartListeners();
    }
  }

  /**
   * Clears the entire cart
   */
  static clearCart(): void {
    this.saveCartToStorage([]);
    this.notifyCartListeners();
  }
}

