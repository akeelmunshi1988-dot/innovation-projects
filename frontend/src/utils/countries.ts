// "India" listed first (and selected by default) since that's the common case for this business.
export const COUNTRIES = [
  'India',
  'United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates',
  'Singapore', 'Germany', 'France', 'Italy', 'Netherlands', 'Switzerland', 'Spain',
  'Saudi Arabia', 'Qatar', 'Japan', 'New Zealand', 'South Africa', 'Other',
];

// Maps the browser's IANA timezone (read silently — no permission prompt, unlike
// navigator.geolocation) to one of the countries above, to preselect country dropdowns.
// This is only a convenience default: the customer can always correct it, and GST/export
// status is calculated from whatever country is actually submitted, not this guess.
const TIMEZONE_COUNTRY: Record<string, string> = {
  'Asia/Kolkata': 'India', 'Asia/Calcutta': 'India',
  'America/New_York': 'United States', 'America/Chicago': 'United States', 'America/Denver': 'United States',
  'America/Los_Angeles': 'United States', 'America/Anchorage': 'United States', 'America/Phoenix': 'United States',
  'Pacific/Honolulu': 'United States', 'America/Detroit': 'United States',
  'Europe/London': 'United Kingdom',
  'America/Toronto': 'Canada', 'America/Vancouver': 'Canada', 'America/Edmonton': 'Canada',
  'America/Winnipeg': 'Canada', 'America/Halifax': 'Canada', 'America/St_Johns': 'Canada', 'America/Regina': 'Canada',
  'Australia/Sydney': 'Australia', 'Australia/Melbourne': 'Australia', 'Australia/Brisbane': 'Australia',
  'Australia/Perth': 'Australia', 'Australia/Adelaide': 'Australia', 'Australia/Darwin': 'Australia', 'Australia/Hobart': 'Australia',
  'Asia/Dubai': 'United Arab Emirates',
  'Asia/Singapore': 'Singapore',
  'Europe/Berlin': 'Germany',
  'Europe/Paris': 'France',
  'Europe/Rome': 'Italy',
  'Europe/Amsterdam': 'Netherlands',
  'Europe/Zurich': 'Switzerland',
  'Europe/Madrid': 'Spain',
  'Asia/Riyadh': 'Saudi Arabia',
  'Asia/Qatar': 'Qatar',
  'Asia/Tokyo': 'Japan',
  'Pacific/Auckland': 'New Zealand',
  'Africa/Johannesburg': 'South Africa',
};

export function detectCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_COUNTRY[tz] ?? 'India';
  } catch {
    return 'India';
  }
}

// Exchange rates are refreshed automatically for every currency below (see
// backend/app/services/fx_rates.py) — Business Settings → Currency no longer
// requires the vendor to track rates manually. "Other" has no confident single
// currency, so it falls back to the tenant's own display currency.
export const CURRENCY_BY_COUNTRY: Record<string, string> = {
  India: 'INR',
  'United States': 'USD',
  'United Kingdom': 'GBP',
  Canada: 'CAD',
  Australia: 'AUD',
  'United Arab Emirates': 'AED',
  Singapore: 'SGD',
  Germany: 'EUR', France: 'EUR', Italy: 'EUR', Netherlands: 'EUR', Spain: 'EUR',
  Switzerland: 'CHF',
  'Saudi Arabia': 'SAR',
  Qatar: 'QAR',
  Japan: 'JPY',
  'New Zealand': 'NZD',
  'South Africa': 'ZAR',
};

export function currencyForCountry(country: string | null | undefined, fallback: string): string {
  if (!country) return fallback;
  return CURRENCY_BY_COUNTRY[country] ?? fallback;
}

// ISO 3166-1 alpha-2 codes the storefront ships to: every country except India
// (the site is gated for Indian visitors — see access_check() in backend/app/main.py).
// Used for the Product structured data's shippingDestination / return-policy countries.
export const SHIPPING_COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA',
  'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT',
  'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR',
  'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH',
  'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH',
  'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR', 'HT',
  'HU', 'ID', 'IE', 'IL', 'IM', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG',
  'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS',
  'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO',
  'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG',
  'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM',
  'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD',
  'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY',
  'SZ', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'YE',
  'YT', 'ZA', 'ZM', 'ZW',
];
