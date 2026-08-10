import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

/**
 * RevenueCat integration — iOS only.
 *
 * IMPORTANT correlation model:
 * The in-app purchase product `com.meinspect.app.report` unlocks a SINGLE
 * inspection report. Instead of tracking RevenueCat entitlements per signed-in
 * user, we switch RevenueCat's `appUserID` to the report's `inspectionId`
 * right before showing the purchase button (see `identifyReport()` below).
 * This mirrors the existing Stripe flow, where `metadata.inspectionId` ties
 * one checkout session to one report — and lets the backend webhook
 * (`/api/webhooks/revenuecat`) resolve exactly which report to unlock, purely
 * from RevenueCat's `app_user_id` field, with no extra state needed.
 *
 * Trust model: nothing in this file ever unlocks a report by itself. A
 * successful purchase() call here only means Apple/RevenueCat accepted the
 * payment — the report stays locked in the UI until the backend confirms via
 * the verified webhook (the client polls GET /api/inspections/:id).
 */

export const REVENUECAT_PUBLIC_API_KEY = 'appl_hlBvGpRJjGtWqfIMcIcsvmIwYug';
export const REPORT_PRODUCT_ID = 'com.meinspect.app.report';

let configured = false;

/** True only on native iOS (Capacitor). RevenueCat purchase UI never shows on web/Android. */
export function isRevenueCatPlatform(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Initialize the RevenueCat SDK on app startup. iOS only, no-op elsewhere.
 * Safe to call multiple times.
 */
export async function initRevenueCat(): Promise<void> {
  if (!isRevenueCatPlatform() || configured) return;
  try {
    await Purchases.configure({ apiKey: REVENUECAT_PUBLIC_API_KEY });
    configured = true;
    console.log('[RevenueCat] Configured for iOS');
  } catch (err) {
    console.error('[RevenueCat] Failed to configure:', err);
  }
}

/**
 * Switch RevenueCat's appUserID to the given inspection/report id so that
 * subsequent purchase/entitlement checks are scoped to this exact report.
 */
export async function identifyReport(inspectionId: string): Promise<void> {
  if (!isRevenueCatPlatform()) return;
  await initRevenueCat();
  try {
    await Purchases.logIn({ appUserID: inspectionId });
  } catch (err) {
    console.error('[RevenueCat] logIn failed:', err);
    throw err;
  }
}

/**
 * Check whether this specific report has already been purchased, according
 * to RevenueCat's cached customer info. Used only to avoid showing a
 * redundant "Buy" button — the backend webhook remains the sole source of
 * truth for actually unlocking the report.
 */
export async function hasPurchasedReport(): Promise<boolean> {
  if (!isRevenueCatPlatform()) return false;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    const hasNonSubTransaction = (customerInfo.nonSubscriptionTransactions || []).some(
      (t) => t.productIdentifier === REPORT_PRODUCT_ID
    );
    const hasActiveEntitlement = Object.keys(customerInfo.entitlements?.active || {}).length > 0;
    return hasNonSubTransaction || hasActiveEntitlement;
  } catch (err) {
    console.error('[RevenueCat] getCustomerInfo failed:', err);
    return false;
  }
}

export type PurchaseOutcome =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/**
 * Purchase the report unlock product. Never unlocks anything directly —
 * callers must poll the backend after this resolves with status 'success'.
 */
export async function purchaseReport(): Promise<PurchaseOutcome> {
  if (!isRevenueCatPlatform()) {
    return { status: 'error', message: 'In-app purchase is only available on iOS.' };
  }
  try {
    const offerings = await Purchases.getOfferings();
    let productToBuy: import('@revenuecat/purchases-capacitor').PurchasesPackage | null = null;

    // Prefer a package from the current offering that matches our product id.
    if (offerings.current) {
      productToBuy = offerings.current.availablePackages.find(
        (p) => p.product?.identifier === REPORT_PRODUCT_ID
      );
    }
    if (!productToBuy) {
      for (const offering of Object.values(offerings.all || {})) {
        const pkg = offering.availablePackages.find(
          (p) => p.product?.identifier === REPORT_PRODUCT_ID
        );
        if (pkg) { productToBuy = pkg; break; }
      }
    }
    if (productToBuy) {
      await Purchases.purchasePackage({ aPackage: productToBuy });
    } else {
      // Fallback: no offering/package configured in the RevenueCat dashboard
      // for this product — fetch the raw store product and purchase directly.
      const { products } = await Purchases.getProducts({ productIdentifiers: [REPORT_PRODUCT_ID] });
      const product = products?.[0];
      if (!product) {
        return { status: 'error', message: 'Report purchase product is not available right now.' };
      }
      await Purchases.purchaseStoreProduct({ product });
    }

    return { status: 'success' };
  } catch (err: any) {
    // RevenueCat sets userCancelled on the error for user-initiated cancellation.
    if (err?.userCancelled) {
      return { status: 'cancelled' };
    }
    console.error('[RevenueCat] purchase failed:', err);
    return { status: 'error', message: err?.message || 'Purchase failed. Please try again.' };
  }
}
