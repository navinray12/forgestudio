/**
 * Phase 16: Full Regression Suite — Commerce, Domains & Backups
 *
 * Milestone P — Covers Phases 18 & 19:
 *   - Product validation & WooCommerce parity export
 *   - Cart total calculations (tax, shipping, coupon discount)
 *   - Order lifecycle state machine
 *   - Custom domain validation & verification token generation
 *   - Website backup creation, restore, expiry pruning
 *   - Backup policy validation
 */

import {
  validateProduct,
  validateCoupon,
  validateCommerceSettings,
  calculateCartTotals,
  computeCouponDiscount,
  isValidOrderTransition,
  getNextOrderStatuses,
  toWooCommercePayload,
  formatPrice,
  DEFAULT_COMMERCE_SETTINGS,
  type Cart,
  type Coupon,
  type CommerceProduct,
  type OrderStatus,
} from "../services/ecommerce/commerce.service.js";

import {
  validateDomain,
  createDomainRecord,
  simulateVerificationCheck,
  isValidDomainStatusTransition,
  setOnePrimary,
  getPrimaryDomain,
  generateVerificationToken,
} from "../services/domains/customDomain.service.js";

import {
  createBackupRecord,
  appendBackup,
  stripSnapshot,
  restoreFromBackup,
  pruneExpiredBackups,
  validateBackupPolicy,
  MAX_BACKUPS_PER_WEBSITE,
} from "../services/backups/websiteBackup.service.js";

// ---------------------------------------------------------------------------
// Tiny test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`[PASS] ${label}`);
    passed++;
  } else {
    console.error(`[FAIL] ${label}`);
    failed++;
    failures.push(label);
  }
}

function assertThrows(fn: () => any, label: string) {
  try {
    fn();
    console.error(`[FAIL] ${label} — expected an error but none was thrown`);
    failed++;
    failures.push(label);
  } catch {
    console.log(`[PASS] ${label}`);
    passed++;
  }
}

// ===========================================================================
// SECTION 1: Commerce — Product Validation
// ===========================================================================

console.log("\n--- Phase 18 | Section 1: Product Validation ---");

const raw1: Partial<CommerceProduct> = {
  name: "Artisan Coffee Mug",
  price: 24.99,
  stock: 150,
  type: "simple",
  status: "publish",
};
const p1 = validateProduct(raw1);
assert(p1.name === "Artisan Coffee Mug", "P1.1: name is preserved");
assert(p1.price === 24.99, "P1.2: price is preserved");
assert(p1.status === "publish", "P1.3: status is publish");
assert(p1.slug === "artisan-coffee-mug", "P1.4: slug is auto-generated");
assert(p1.currency === "USD", "P1.5: currency defaults to USD");

assertThrows(() => validateProduct({ price: 10 }), "P1.6: throws if name is missing");
assertThrows(() => validateProduct({ name: "Test", price: -5 }), "P1.7: throws if price is negative");

const rawSanitized = validateProduct({ name: "T-Shirt", price: 0, type: "invalid" as any });
assert(rawSanitized.type === "simple", "P1.8: invalid type falls back to simple");

// ===========================================================================
// SECTION 2: Commerce — Cart Totals & Coupons
// ===========================================================================

console.log("\n--- Phase 18 | Section 2: Cart Totals & Coupons ---");

const cart1: Cart = {
  items: [
    { productId: "p1", quantity: 2, unitPrice: 30, name: "Widget A" },
    { productId: "p2", quantity: 1, unitPrice: 15, name: "Widget B" },
  ],
  discountAmount: 0,
  shippingCost: 5,
  taxRate: 10,
  currency: "USD",
};

const settingsNoTax = DEFAULT_COMMERCE_SETTINGS;
const totals1 = calculateCartTotals(cart1, settingsNoTax);
assert(totals1.subtotal === 75, "P2.1: subtotal = 2*30+1*15 = 75");
assert(totals1.taxAmount === 0, "P2.2: tax is 0 when taxEnabled=false");
assert(totals1.shippingCost === 0, "P2.3: shipping is 0 when shippingEnabled=false");
assert(totals1.total === 75, "P2.4: total = subtotal when no tax/shipping");

const settingsTax = { ...DEFAULT_COMMERCE_SETTINGS, taxEnabled: true, taxRate: 10, shippingEnabled: true };
const totals2 = calculateCartTotals(cart1, settingsTax);
assert(totals2.shippingCost === 5, "P2.5: shipping cost applied when shippingEnabled=true");
assert(totals2.taxAmount === 8, "P2.6: tax = (75+5) * 10% = 8");
assert(totals2.total === 88, "P2.7: total = 75+5+8 = 88");

// Percent coupon
const couponPct: Coupon = validateCoupon({ code: "SAVE20", type: "percent", amount: 20 });
assert(couponPct.code === "SAVE20", "P2.8: coupon code normalized to uppercase");
const discountPct = computeCouponDiscount(couponPct, cart1.items, 75);
assert(discountPct === 15, "P2.9: 20% off 75 = 15");

// Fixed cart coupon
const couponFixed: Coupon = validateCoupon({ code: "FLAT10", type: "fixed_cart", amount: 10 });
const discountFixed = computeCouponDiscount(couponFixed, cart1.items, 75);
assert(discountFixed === 10, "P2.10: fixed_cart coupon deducts flat amount");

// Expired coupon
const couponExpired: Coupon = {
  ...couponFixed,
  expiresAt: "2000-01-01T00:00:00Z",
  usageCount: 0,
};
const discountExpired = computeCouponDiscount(couponExpired, cart1.items, 75);
assert(discountExpired === 0, "P2.11: expired coupon returns 0 discount");

// Exceeded usage limit
const couponUsedUp: Coupon = { ...couponFixed, maxUsage: 5, usageCount: 5 };
const discountUsed = computeCouponDiscount(couponUsedUp, cart1.items, 75);
assert(discountUsed === 0, "P2.12: fully used coupon returns 0 discount");

// Minimum order not met
const couponMinOrder: Coupon = { ...couponFixed, minOrderAmount: 100 };
const discountMin = computeCouponDiscount(couponMinOrder, cart1.items, 75);
assert(discountMin === 0, "P2.13: coupon does not apply below minOrderAmount");

// ===========================================================================
// SECTION 3: Commerce — Order Lifecycle
// ===========================================================================

console.log("\n--- Phase 18 | Section 3: Order Lifecycle ---");

assert(isValidOrderTransition("pending", "processing"), "P3.1: pending -> processing is valid");
assert(isValidOrderTransition("processing", "completed"), "P3.2: processing -> completed is valid");
assert(!isValidOrderTransition("completed", "processing"), "P3.3: completed -> processing is invalid");
assert(!isValidOrderTransition("cancelled", "active" as OrderStatus), "P3.4: cancelled -> active is invalid");
assert(isValidOrderTransition("processing", "refunded"), "P3.5: processing -> refunded is valid");
assert(isValidOrderTransition("failed", "pending"), "P3.6: failed -> pending allows retry");

const nextFromProcessing = getNextOrderStatuses("processing");
assert(nextFromProcessing.includes("completed"), "P3.7: getNextOrderStatuses includes completed from processing");
assert(nextFromProcessing.includes("cancelled"), "P3.8: getNextOrderStatuses includes cancelled from processing");

// ===========================================================================
// SECTION 4: Commerce — WooCommerce Export Parity
// ===========================================================================

console.log("\n--- Phase 18 | Section 4: WooCommerce Export ---");

const product: CommerceProduct = validateProduct({
  name: "Premium Widget",
  price: 49.99,
  salePrice: 39.99,
  images: ["https://example.com/img1.jpg"],
  categories: ["Electronics"],
  tags: ["new", "sale"],
  stock: 25,
  type: "simple",
  status: "publish",
  attributes: [{ name: "Color", values: ["Red", "Blue"], isVariant: true }],
  digitalDownload: false,
});

const wcPayload = toWooCommercePayload(product);
assert(wcPayload.name === "Premium Widget", "P4.1: WC payload name matches product name");
assert(wcPayload.sale_price === "39.99", "P4.2: WC payload sale_price is stringified");
assert(wcPayload.regular_price === "49.99", "P4.3: WC payload regular_price is stringified");
assert(wcPayload.stock_quantity === 25, "P4.4: WC payload stock_quantity matches");
assert(wcPayload.images.length === 1, "P4.5: WC payload images array is correct");
assert(wcPayload.categories[0].name === "Electronics", "P4.6: WC payload categories have name key");
assert(wcPayload.attributes[0].variation === true, "P4.7: WC attribute variation=true for variant attribute");

// Price formatting
const formattedUSD = formatPrice(1234.5, DEFAULT_COMMERCE_SETTINGS);
assert(formattedUSD === "$1,234.50", "P4.8: formatPrice produces $1,234.50");

const euSettings = validateCommerceSettings({
  currency: "EUR",
  currencySymbol: "€",
  currencyPosition: "after",
  thousandSeparator: ".",
  decimalSeparator: ",",
  numDecimals: 2,
});
const formattedEUR = formatPrice(1234.5, euSettings);
assert(formattedEUR === "1.234,50€", "P4.9: formatPrice produces European format 1.234,50€");

// ===========================================================================
// SECTION 5: Custom Domain Validation
// ===========================================================================

console.log("\n--- Phase 19 | Section 5: Custom Domain Validation ---");

const validDomain = validateDomain("shop.example.com");
assert(validDomain === "shop.example.com", "D1.1: valid domain passes validation");

const normalised = validateDomain("  HTTPS://Shop.Example.COM/path ");
assert(normalised === "shop.example.com", "D1.2: domain normalised (lower, strip protocol/path)");

assertThrows(() => validateDomain("not_a_domain"), "D1.3: rejects plain string without TLD");
assertThrows(() => validateDomain("localhost"), "D1.4: rejects .localhost TLD");
assertThrows(() => validateDomain(""), "D1.5: rejects empty domain");

// ===========================================================================
// SECTION 6: Domain Verification
// ===========================================================================

console.log("\n--- Phase 19 | Section 6: Domain Verification ---");

const domainRecord = createDomainRecord("shop.example.com", "website-id-123", "TXT", true);
assert(domainRecord.status === "pending", "D2.1: new domain starts as pending");
assert(domainRecord.isPrimary === true, "D2.2: first domain is marked primary");
assert(domainRecord.verificationToken.length >= 32, "D2.3: verification token has at least 32 chars");
assert(domainRecord.verificationMethod === "TXT", "D2.4: verification method is TXT");

const check = simulateVerificationCheck(domainRecord);
assert(check.success === true, "D2.5: verification succeeds with valid token");

const badRecord = { ...domainRecord, verificationToken: "short" };
const badCheck = simulateVerificationCheck(badRecord);
assert(badCheck.success === false, "D2.6: verification fails with malformed token");

// Token determinism
const t1 = generateVerificationToken("example.com", "ws-1");
const t2 = generateVerificationToken("example.com", "ws-1");
assert(t1 === t2, "D2.7: token generation is deterministic for same inputs");

const t3 = generateVerificationToken("other.com", "ws-1");
assert(t1 !== t3, "D2.8: different domains produce different tokens");

// Status machine
assert(isValidDomainStatusTransition("pending", "verifying"), "D2.9: pending -> verifying is valid");
assert(isValidDomainStatusTransition("verifying", "active"), "D2.10: verifying -> active is valid");
assert(!isValidDomainStatusTransition("active", "pending"), "D2.11: active -> pending is invalid");

// Primary management
const domains = [
  { ...domainRecord, domain: "a.example.com", status: "active", isPrimary: true },
  { ...domainRecord, domain: "b.example.com", status: "active", isPrimary: false },
];
const withNewPrimary = setOnePrimary(domains as any, "b.example.com");
assert(withNewPrimary.find((d: any) => d.domain === "b.example.com")!.isPrimary === true, "D2.12: setOnePrimary sets b as primary");
assert(withNewPrimary.find((d: any) => d.domain === "a.example.com")!.isPrimary === false, "D2.13: setOnePrimary clears a as primary");

const primary = getPrimaryDomain(withNewPrimary as any);
assert(primary?.domain === "b.example.com", "D2.14: getPrimaryDomain returns b.example.com");

// ===========================================================================
// SECTION 7: Website Backups
// ===========================================================================

console.log("\n--- Phase 19 | Section 7: Website Backups ---");

const mockEditorData = {
  version: 2,
  pages: [{ id: "p1", name: "Home", elements: [] }],
  globalStyles: { colors: { primary: "#3b82f6" } },
  globalVariables: [{ token: "--brand-color", value: "#3b82f6", type: "color" }],
};

const backup1 = createBackupRecord(mockEditorData, { trigger: "manual", label: "Test Backup" });
assert(backup1.id.startsWith("bkp_"), "B1.1: backup id starts with bkp_");
assert(backup1.status === "ready", "B1.2: new backup status is ready");
assert(backup1.trigger === "manual", "B1.3: trigger is manual");
assert(backup1.sizeBytes > 0, "B1.4: sizeBytes is positive");
assert(!backup1.snapshot.backups, "B1.5: snapshot does not contain nested backups");
assert(backup1.schemaVersion === 2, "B1.6: schemaVersion matches editorData.version");

// Strip snapshot
const meta = stripSnapshot(backup1);
assert(!(meta as any).snapshot, "B1.7: stripSnapshot removes snapshot payload");
assert(meta.id === backup1.id, "B1.8: stripSnapshot preserves id");

// Append and prune
let backupList: any[] = [];
for (let i = 0; i < MAX_BACKUPS_PER_WEBSITE + 5; i++) {
  const b = createBackupRecord({ version: 1, pages: [] }, { trigger: "scheduled" });
  backupList = appendBackup(backupList, b);
}
assert(backupList.length === MAX_BACKUPS_PER_WEBSITE, `B1.9: backup list capped at ${MAX_BACKUPS_PER_WEBSITE}`);
assert(backupList[0].createdAt >= backupList[MAX_BACKUPS_PER_WEBSITE - 1].createdAt, "B1.10: newest backup is first in list");

// Restore
const editorDataWithBackups = { ...mockEditorData, backups: [backup1] };
const restored = restoreFromBackup(editorDataWithBackups, backup1);
assert(restored._lastRestoredFrom === backup1.id, "B1.11: restored data contains _lastRestoredFrom");
assert(Array.isArray(restored.backups), "B1.12: backup list is preserved through restore");
assert(restored.globalStyles?.colors?.primary === "#3b82f6", "B1.13: globalStyles are restored correctly");

// Restore invalid backup (status !== ready)
const brokenBackup = { ...backup1, status: "failed" as const };
assertThrows(() => restoreFromBackup(editorDataWithBackups, brokenBackup), "B1.14: cannot restore a failed backup");

// Expiry pruning
const expiredBackup = createBackupRecord({ version: 1 }, { trigger: "manual", expiresAt: "2000-01-01T00:00:00Z" });
const validBackup = createBackupRecord({ version: 1 }, { trigger: "manual" });
const pruned = pruneExpiredBackups([expiredBackup, validBackup]);
assert(pruned.length === 1, "B1.15: pruneExpiredBackups removes expired entries");
assert(pruned[0].id === validBackup.id, "B1.16: unexpired backup is retained");

// Backup policy validation
const policy = validateBackupPolicy({ enabled: true, cronExpression: "0 3 * * *", retainCount: 10 });
assert(policy.enabled === true, "B1.17: valid policy enabled flag");
assert(policy.cronExpression === "0 3 * * *", "B1.18: cronExpression is preserved");
assert(policy.retainCount === 10, "B1.19: retainCount is preserved");

const defaultPolicy = validateBackupPolicy(null);
assert(defaultPolicy.enabled === false, "B1.20: default policy is disabled");
assert(defaultPolicy.retainCount === 7, "B1.21: default retainCount is 7");

// Clamp retainCount
const clampedPolicy = validateBackupPolicy({ retainCount: 100 });
assert(clampedPolicy.retainCount === 25, "B1.22: retainCount clamped to 25");

// ===========================================================================
// RESULTS
// ===========================================================================

console.log(`
=================================================
RUNNING FORGESTUDIO MILESTONE P VERIFICATION SUITE
Phases 18 & 19: E-Commerce + Domains & Backups
=================================================
`);
console.log(`\n=================================================`);
console.log(`MILESTONE P RESULTS: ${passed} PASSED, ${failed} FAILED`);
if (failures.length > 0) {
  console.log(`\nFailed tests:`);
  failures.forEach((f) => console.log(`  - ${f}`));
}
console.log(`=================================================\n`);

if (failed > 0) {
  process.exit(1);
}
