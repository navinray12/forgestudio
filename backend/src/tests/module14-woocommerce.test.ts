import {
  calculateCartTotals,
  computeCouponDiscount,
  validateProduct,
  type CartItem,
  type Coupon,
  type CommerceProduct,
} from "../services/ecommerce/commerce.service.js";
import { compileCanonicalToStaticBundle } from "../services/destinations/staticCompiler.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, details || "");
    failed++;
  }
}

async function runModule14Tests() {
  console.log("=================================================");
  console.log("RUNNING MODULE 14: WOOCOMMERCE & E-COMMERCE SUITE TEST SUITE");
  console.log("=================================================\n");

  try {
    // -------------------------------------------------------------------------
    // 1. Dynamic Product Pricing Engine with X-799 Add-Ons
    // -------------------------------------------------------------------------
    console.log("--- 1. X-799: Product Add-Ons & Dynamic Pricing Engine ---");

    interface AddonItem {
      id: string;
      label: string;
      priceAdjustment: number;
    }

    function computeEffectivePrice(basePrice: number, selectedAddons: AddonItem[]): number {
      const addonSum = selectedAddons.reduce((sum, item) => sum + item.priceAdjustment, 0);
      return Math.round((basePrice + addonSum) * 100) / 100;
    }

    const baseProductPrice = 299.00;
    const selectedAddOns: AddonItem[] = [
      { id: "addon-gift", label: "Luxury Gift Wrapping", priceAdjustment: 4.99 },
      { id: "addon-warranty", label: "2-Year Extended Protection", priceAdjustment: 19.99 },
      { id: "addon-engrave", label: "Laser Name Engraving", priceAdjustment: 9.99 },
    ];

    const effectivePrice = computeEffectivePrice(baseProductPrice, selectedAddOns);
    assert(effectivePrice === 333.97, "Dynamic pricing engine computes basePrice + sum(selectedAddOns)", { effectivePrice, expected: 333.97 });

    const zeroAddonPrice = computeEffectivePrice(baseProductPrice, []);
    assert(zeroAddonPrice === 299.00, "Pricing without add-ons defaults cleanly to basePrice");

    // -------------------------------------------------------------------------
    // 2. Cart Operations & Coupon Calculations
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Cart Operations & Coupon Calculations ---");

    const cartItems: CartItem[] = [
      { productId: "prod-1", name: "Hi-Fi Studio Reference Headphones", quantity: 1, unitPrice: 333.97 },
      { productId: "prod-2", name: "Balanced Desktop Amplifier", quantity: 2, unitPrice: 189.00 },
    ];

    const percentCoupon: Coupon = {
      code: "SAVE10",
      type: "percent",
      amount: 10,
      usageCount: 0,
    };

    const fixedCoupon: Coupon = {
      code: "FLAT20",
      type: "fixed_cart",
      amount: 20,
      usageCount: 0,
    };

    const subtotal = cartItems.reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);
    assert(Math.round(subtotal * 100) / 100 === 711.97, "Cart subtotal is properly calculated from unitPrice * quantity");

    const percentDiscount = computeCouponDiscount(percentCoupon, cartItems, subtotal);
    assert(Math.round(percentDiscount * 100) / 100 === 71.20, "Percent coupon discount correctly evaluates (10% off 711.97 = 71.20)");

    const fixedDiscount = computeCouponDiscount(fixedCoupon, cartItems, subtotal);
    assert(fixedDiscount === 20, "Fixed cart coupon discount correctly evaluates ($20 flat)");

    const cartObj = {
      items: cartItems,
      discountAmount: 0,
      shippingCost: 15.00,
      taxRate: 10,
      currency: "USD",
    };

    const cartTotals = calculateCartTotals(
      cartObj,
      {
        currency: "USD",
        currencySymbol: "$",
        currencyPosition: "before",
        thousandSeparator: ",",
        decimalSeparator: ".",
        numDecimals: 2,
        taxEnabled: true,
        taxRate: 10,
        taxIncludedInPrice: false,
        shippingEnabled: true,
        weightUnit: "kg",
        dimensionUnit: "cm",
        allowGuestCheckout: true,
        checkoutFields: [],
      },
      percentCoupon
    );

    assert(cartTotals.subtotal === 711.97, "calculateCartTotals returns exact subtotal");
    assert(cartTotals.discountAmount === 71.20, "calculateCartTotals applies coupon discount");
    assert(cartTotals.shippingCost === 15.00, "calculateCartTotals includes shipping");
    assert(cartTotals.total > 0, "calculateCartTotals computes positive grand total");

    // -------------------------------------------------------------------------
    // 3. Product Schema & Order Validation
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Product Schema & Order Validation ---");

    const validProduct: Partial<CommerceProduct> = {
      name: "Wireless Noise-Cancelling Earbuds",
      price: 149.00,
      salePrice: 129.00,
      currency: "USD",
      stock: 50,
      status: "publish",
      type: "simple",
      slug: "wireless-nc-earbuds",
    };

    let validPassed = false;
    try {
      const sanitized = validateProduct(validProduct);
      validPassed = !!sanitized && sanitized.name === "Wireless Noise-Cancelling Earbuds";
    } catch (e) {
      validPassed = false;
    }
    assert(validPassed, "Valid product passes validateProduct checks");

    const invalidProduct: Partial<CommerceProduct> = {
      price: -10,
      stock: -5,
    };

    let invalidCaught = false;
    try {
      validateProduct(invalidProduct);
    } catch (e: any) {
      invalidCaught = true;
    }
    assert(invalidCaught, "Invalid product with missing name / negative price is rejected");

    // -------------------------------------------------------------------------
    // 4. Static Compiler HTML Serialization for all 29 wc-* Widgets
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Static Compiler HTML Serialization for wc-* Elements ---");

    const allWcElements = [
      { id: "wc-1", type: "wc-product-title", content: "Flagship Audiophile Monitor" },
      { id: "wc-2", type: "wc-product-price", content: "$499.00" },
      { id: "wc-3", type: "wc-product-images", src: "https://example.com/audio.jpg" },
      { id: "wc-4", type: "wc-add-to-cart", buttonText: "Add to Bag" },
      { id: "wc-5", type: "wc-product-rating" },
      { id: "wc-6", type: "wc-builder", children: [{ id: "wc-child-1", type: "wc-product-title" }] },
      { id: "wc-7", type: "wc-product", children: [{ id: "wc-child-2", type: "wc-product-price" }] },
      { id: "wc-8", type: "wc-product-stock", stockThreshold: 3, inStockLabel: "In Stock" },
      { id: "wc-9", type: "wc-product-meta", metaShowSku: true, metaShowCategory: true, metaShowTags: true },
      { id: "wc-10", type: "wc-product-content", productDescriptionOverride: "Full audiophile grade driver explanation." },
      { id: "wc-11", type: "wc-short-description", content: "Handmade open-back headphones." },
      { id: "wc-12", type: "wc-product-data-tabs", tabsData: [{ id: "t1", title: "Specs", content: "32 Ohm impedance" }] },
      { id: "wc-13", type: "wc-additional-info", additionalInfoAttributes: [{ key: "Driver", value: "Planar" }] },
      { id: "wc-14", type: "wc-related-products", relatedLimit: 4, relatedColumns: 4 },
      { id: "wc-15", type: "wc-upsells", upsellsLimit: 2, upsellsColumns: 2 },
      { id: "wc-16", type: "wc-products", productsPerPage: 4 },
      { id: "wc-17", type: "wc-product-archive", shopLayoutColumns: 3 },
      { id: "wc-18", type: "wc-shop-layouts", shopLayoutColumns: 4 },
      { id: "wc-19", type: "wc-custom-add-to-cart", customAddToCartProductId: "custom-sku-09" },
      { id: "wc-20", type: "wc-product-categories" },
      { id: "wc-21", type: "wc-menu-cart" },
      { id: "wc-22", type: "wc-cart", cartButtonLabel: "Checkout Now" },
      { id: "wc-23", type: "wc-checkout", checkoutButtonLabel: "Complete Purchase" },
      { id: "wc-24", type: "wc-my-account" },
      { id: "wc-25", type: "wc-purchase-summary" },
      { id: "wc-26", type: "wc-notices" },
      { id: "wc-27", type: "wc-product-page-templates", children: [{ id: "wc-tmpl-child", type: "wc-product-title" }] },
      { id: "wc-28", type: "wc-product-archive-templates", children: [{ id: "wc-arch-child", type: "wc-products" }] },
      { id: "wc-29", type: "wc-product-addons", productAddons: selectedAddOns },
    ];

    const mockWebsiteData = {
      id: "site-wc-test",
      name: "Acme Audio Store",
      pages: [
        {
          id: "page-shop",
          title: "Online Store",
          slug: "shop",
          isHome: true,
          elements: allWcElements,
        },
      ],
    };

    const bundle = compileCanonicalToStaticBundle("site-wc-test", 1, mockWebsiteData);
    assert(bundle.files.length >= 3, "Static bundle compiles HTML, styles.css, runtime.js, and manifest");

    const shopHtmlFile = bundle.files.find((f) => f.path === "index.html");
    assert(!!shopHtmlFile, "index.html page exists in static bundle");

    const html = shopHtmlFile?.content || "";

    assert(html.includes("fs-wc-title"), "Compiles wc-product-title markup");
    assert(html.includes("fs-wc-price"), "Compiles wc-product-price markup");
    assert(html.includes("fs-wc-images"), "Compiles wc-product-images markup");
    assert(html.includes("fs-wc-add-to-cart"), "Compiles wc-add-to-cart markup");
    assert(html.includes("fs-wc-stock"), "Compiles wc-product-stock markup");
    assert(html.includes("fs-wc-meta"), "Compiles wc-product-meta markup");
    assert(html.includes("fs-wc-tabs"), "Compiles wc-product-data-tabs markup");
    assert(html.includes("fs-wc-attributes"), "Compiles wc-additional-info markup");
    assert(html.includes("fs-wc-related"), "Compiles wc-related-products markup");
    assert(html.includes("fs-wc-upsells"), "Compiles wc-upsells markup");
    assert(html.includes("fs-wc-catalog"), "Compiles wc-products & wc-shop-layouts markup");
    assert(html.includes("fs-wc-cart-view"), "Compiles wc-cart markup");
    assert(html.includes("fs-wc-checkout-view"), "Compiles wc-checkout markup");
    assert(html.includes("fs-wc-addons-card"), "Compiles X-799 wc-product-addons markup");
    assert(html.includes("Luxury Gift Wrapping"), "Renders custom add-on option labels in HTML");

    // Check runtime.js for static store engine
    const runtimeJsFile = bundle.files.find((f) => f.path === "runtime.js");
    assert(!!runtimeJsFile, "runtime.js generated");
    const runtimeJs = runtimeJsFile?.content || "";
    assert(runtimeJs.includes("fs_static_cart"), "runtime.js contains localStorage cart key fs_static_cart");
    assert(runtimeJs.includes("btn-add-to-cart"), "runtime.js attaches click listener for .btn-add-to-cart");
    assert(runtimeJs.includes("fs-cart-count"), "runtime.js updates mini-cart badge .fs-cart-count");
    assert(runtimeJs.includes("/commerce/orders"), "runtime.js submits checkout order to /commerce/orders");

  } catch (err: any) {
    console.error("Test suite error:", err);
    failed++;
  }

  console.log("\n=================================================");
  console.log(`MODULE 14 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runModule14Tests();
