const LOCALE_MAP: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

export const CURRENCIES = [
  { code: 'INR', label: 'Indian Rupee (₹)', symbol: '₹' },
  { code: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { code: 'EUR', label: 'Euro (€)', symbol: '€' },
  { code: 'GBP', label: 'British Pound (£)', symbol: '£' },
];

// Maps a locale's region subtag (e.g. the "IN" in "en-IN") to one of the currencies
// this app supports. Deliberately conservative — a region with no confident mapping
// here falls through to the tenant's own configured default rather than guessing.
const REGION_TO_CURRENCY: Record<string, string> = {
  IN: 'INR',
  GB: 'GBP',
  // Eurozone
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR',
  IE: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR',
  EE: 'EUR', LV: 'EUR', LT: 'EUR', CY: 'EUR', MT: 'EUR', HR: 'EUR',
  // USD — US plus territories/countries that peg to or commonly price in USD
  US: 'USD', PR: 'USD', EC: 'USD', PA: 'USD',
};

/**
 * Best-effort currency guess from the browser's own locale info (navigator.languages) —
 * no IP lookup, no third-party geolocation service, nothing that needs an API key.
 * Returns null when the visitor's region isn't one we have a confident mapping for,
 * so the caller can fall back to the tenant's configured default currency instead.
 */
export function detectCurrencyFromLocale(): string | null {
  if (typeof navigator === 'undefined') return null;
  const locales = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  for (const loc of locales) {
    if (!loc) continue;
    const region = loc.split('-')[1]?.toUpperCase();
    if (region && REGION_TO_CURRENCY[region]) return REGION_TO_CURRENCY[region];
  }
  return null;
}

export function fmt(n: number, currency = 'INR', fractions = 0): string {
  const locale = LOCALE_MAP[currency] ?? 'en-IN';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: fractions,
    minimumFractionDigits: fractions,
  }).format(n);
}

export function fmtExact(n: number, currency = 'INR'): string {
  return fmt(n, currency, 2);
}

export function currencySymbol(currency: string): string {
  return CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;
}

// ── Conversion ────────────────────────────────────────────────────────────────

interface TenantLike {
  currency: string;
  base_currency: string;
  exchange_rates: Record<string, number>;
}

/**
 * Compute the multiplier to convert `fromCurrency` → `toCurrency`.
 *
 * `rates` stores how many units of each foreign currency equal 1 unit of baseCurrency.
 *   e.g. baseCurrency=INR, rates={"USD":0.012} means 1 INR = $0.012
 *
 * Rate of base currency relative to itself is always 1.
 * Conversion formula: amount_in_to = amount_in_from × (toRate / fromRate)
 */
export function getConversionRate(
  fromCurrency: string,
  toCurrency: string,
  baseCurrency: string,
  rates: Record<string, number>,
): number {
  if (fromCurrency === toCurrency) return 1;

  const fromRate = fromCurrency === baseCurrency ? 1 : (rates[fromCurrency] ?? 0);
  const toRate   = toCurrency   === baseCurrency ? 1 : (rates[toCurrency]   ?? 0);

  if (fromRate === 0 || toRate === 0) return 1; // unknown rate — show raw value
  return toRate / fromRate;
}

/**
 * Format a stored DB amount for display.
 *
 * @param n            The stored numeric value
 * @param tenant       Tenant settings (display currency, base currency, rates dict)
 * @param itemCurrency The currency the value was stored in (defaults to base_currency)
 *
 * Examples:
 *   fmtTenant(500, tenant)                         // material cost in base currency
 *   fmtTenant(500, tenant, material.cost_currency) // material cost, per its own stored currency
 *   fmtTenant(50000, tenant, quote.price_currency) // quote price, per its own stored currency
 */
export function fmtTenant(
  n: number,
  tenant: TenantLike,
  itemCurrency?: string | null,
): string {
  const from = itemCurrency ?? tenant.base_currency;
  const rate = getConversionRate(from, tenant.currency, tenant.base_currency, tenant.exchange_rates ?? {});
  return fmtExact(n * rate, tenant.currency);
}
