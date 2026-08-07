import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getPublicSettings } from '../services/api';
import { fmt, getConversionRate, CURRENCIES, detectCurrencyFromLocale } from '../utils/currency';

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
  const [baseCurrency, setBaseCurrency] = useState('INR');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  // Priority: an explicit pick the visitor already made (persisted) > a confident guess
  // from their browser locale (no IP lookup, no third-party service) > the tenant's own
  // configured default, fetched below once settings load.
  const [displayCurrency, setDisplayCurrencyState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) || detectCurrencyFromLocale() || 'INR'
  );

  useEffect(() => {
    getPublicSettings()
      .then((data) => {
        setBaseCurrency(data.base_currency || 'INR');
        setExchangeRates(data.exchange_rates || {});
        // Only fall back to the tenant's display currency if the visitor hasn't picked one
        // yet AND their browser locale didn't resolve to a currency we support.
        if (!localStorage.getItem(STORAGE_KEY) && !detectCurrencyFromLocale()) {
          setDisplayCurrencyState(data.currency || 'INR');
        }
      })
      .catch(() => {});
  }, []);

  const setDisplayCurrency = useCallback((code: string) => {
    localStorage.setItem(STORAGE_KEY, code);
    setDisplayCurrencyState(code);
  }, []);

  const displayPrice = useCallback((amount: number, itemCurrency?: string | null): string => {
    const from = itemCurrency || baseCurrency;
    const rate = getConversionRate(from, displayCurrency, baseCurrency, exchangeRates);
    return fmt(amount * rate, displayCurrency, 0);
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
