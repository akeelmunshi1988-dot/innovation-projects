/**
 * Code-level feature flags — flip a value here and redeploy to show/hide a
 * feature across the app. For settings the tenant/admin should control
 * themselves, use Business Settings instead; this file is for flags only
 * a developer should flip.
 */
export const FEATURE_FLAGS = {
  /** Billing menu + /admin/billing page. Off for now. */
  SHOW_BILLING: false,
  /** Customer cart, checkout, and direct-order CTAs. Off keeps the shop quote-only. */
  SHOW_DIRECT_PURCHASE: false,
};
