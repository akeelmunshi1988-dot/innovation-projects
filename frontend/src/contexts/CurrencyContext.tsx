import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getPublicSettings, detectGuestCountry } from '../services/api';
import { fmt, getConversionRate, CURRENCIES, detectCurrencyFromLocale } from '../utils/currency';
import { currencyForCountry } from '../utils/countries';
import { useCustomerAuth } from './CustomerAuthContext';

interface CurrencyContextValue {
  displayCurrency: string;
  setDisplayCurrency: (code: string) => void;
  availableCurrencies: typeof CURRENCIES;
  /** The tenant's real transactional currency — payments are always processed in this currency, regardless of displayCurrency. */
  baseCurrency: string;
  /** Convert + format a stored amount for display, given the currency it was stored in (defaults to tenant base currency). */
  displayPrice: (amount: number, itemCurrency?: string | null) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = 'loomcraftrugs_display_currency';

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { customer, isCustomerAuthenticated } = useCustomerAuth();
  const [baseCurrency, setBaseCurrency] = useState('INR');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  // Priority, highest first: an explicit pick the visitor already made (persisted) >
  // a logged-in customer's own saved country (authoritative) > a guest's IP-geolocated
  // country (best-effort) > a guess from their browser locale (no IP lookup) > the
  // tenant's own configured default. Everything past the explicit pick is resolved
  // asynchronously below; this initial value avoids a flash of the wrong currency
  // before that resolves.
  const [displayCurrency, setDisplayCurrencyState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) || detectCurrencyFromLocale() || 'INR'
  );

  useEffect(() => {
    let cancelled = false;
    getPublicSettings()
      .then(async (data) => {
        if (cancelled) return;
        setBaseCurrency(data.base_currency || 'INR');
        setExchangeRates(data.exchange_rates || {});

        if (localStorage.getItem(STORAGE_KEY)) return; // visitor's own choice always wins
        const tenantDefault = data.currency || 'INR';

        if (isCustomerAuthenticated && customer?.country) {
          setDisplayCurrencyState(currencyForCountry(customer.country, tenantDefault));
          return;
        }

        if (!isCustomerAuthenticated) {
          try {
            const country = await detectGuestCountry();
            if (cancelled) return;
            if (country) {
              setDisplayCurrencyState(currencyForCountry(country, tenantDefault));
              return;
            }
          } catch {
            // Geolocation is best-effort — fall through to the locale guess/tenant default below.
          }
        }

        // No authoritative or geolocated country available — keep the browser-locale
        // guess already used as the initial state, or fall back to the tenant default.
        if (!detectCurrencyFromLocale()) {
          setDisplayCurrencyState(tenantDefault);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isCustomerAuthenticated, customer?.country]);

  const setDisplayCurrency = useCallback((code: string) => {
    localStorage.setItem(STORAGE_KEY, code);
    setDisplayCurrencyState(code);
  }, []);

  const displayPrice = useCallback((amount: number, itemCurrency?: string | null): string => {
    const from = itemCurrency || baseCurrency;
    const rate = getConversionRate(from, displayCurrency, baseCurrency, exchangeRates);
    const converted = amount * rate;
    // A nonzero amount that would round away to "0" at 0 decimal places (e.g. a
    // small base price converted into a stronger currency) needs decimal places
    // to still show a meaningful value instead of a misleading zero.
    const fractions = converted !== 0 && Math.round(converted) === 0 ? 2 : 0;
    return fmt(converted, displayCurrency, fractions);
  }, [baseCurrency, exchangeRates, displayCurrency]);

  return (
    <CurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency, availableCurrencies: CURRENCIES, baseCurrency, displayPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
