import { useEffect, useMemo, useState } from 'react';
import type { User } from '../types';

export type CurrencyCode = 'USD' | 'INR' | 'AED' | 'GBP' | 'EUR' | 'CAD' | 'AUD' | 'SGD' | 'JPY';

export const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  US: 'USD',
  IN: 'INR',
  AE: 'AED',
  GB: 'GBP',
  EU: 'EUR',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  IE: 'EUR',
  CA: 'CAD',
  AU: 'AUD',
  SG: 'SGD',
  JP: 'JPY',
};

const FALLBACK_USD_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  INR: 86,
  AED: 3.67,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.37,
  AUD: 1.53,
  SGD: 1.34,
  JPY: 148,
};

let cachedRates: Record<CurrencyCode, number> | null = null;
let ratePromise: Promise<Record<CurrencyCode, number>> | null = null;

export const detectCountryCode = () => {
  if (typeof navigator === 'undefined') return 'US';
  try {
    const locale = new Intl.Locale(navigator.language);
    return locale.region || 'US';
  } catch {
    return 'US';
  }
};

export const currencyForCountry = (countryCode?: string): CurrencyCode =>
  COUNTRY_TO_CURRENCY[(countryCode || '').toUpperCase()] || 'USD';

export const currencyForUser = (user?: User): CurrencyCode =>
  currencyForCountry(user?.onboarding?.countryCode);

export const currencyMeta: Record<CurrencyCode, { locale: string; symbol: string }> = {
  USD: { locale: 'en-US', symbol: '$' },
  INR: { locale: 'en-IN', symbol: '₹' },
  AED: { locale: 'en-AE', symbol: 'د.إ' },
  GBP: { locale: 'en-GB', symbol: '£' },
  EUR: { locale: 'de-DE', symbol: '€' },
  CAD: { locale: 'en-CA', symbol: 'CA$' },
  AUD: { locale: 'en-AU', symbol: 'A$' },
  SGD: { locale: 'en-SG', symbol: 'S$' },
  JPY: { locale: 'ja-JP', symbol: '¥' },
};

export const loadFxRates = async (): Promise<Record<CurrencyCode, number>> => {
  if (cachedRates) return cachedRates;
  if (ratePromise) return ratePromise;

  ratePromise = fetch('/api/fx-rates', { credentials: 'same-origin', cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) throw new Error('FX request failed');
      const payload = await response.json() as { rates?: Record<string, number> };
      const next = { ...FALLBACK_USD_RATES };
      for (const code of Object.keys(next) as CurrencyCode[]) {
        if (code === 'USD') continue;
        const value = payload.rates?.[code];
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) next[code] = value;
      }
      cachedRates = next;
      return next;
    })
    .catch(() => {
      cachedRates = FALLBACK_USD_RATES;
      return FALLBACK_USD_RATES;
    })
    .finally(() => {
      ratePromise = null;
    });

  return ratePromise;
};

export const convertUsd = (usdAmount: number, currency: CurrencyCode, rates = cachedRates || FALLBACK_USD_RATES) =>
  Math.round(usdAmount * (rates[currency] || 1));

export const formatMoney = (amount: number, currency: CurrencyCode, rates = cachedRates || FALLBACK_USD_RATES) => {
  const value = convertUsd(amount, currency, rates);
  return new Intl.NumberFormat(currencyMeta[currency].locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'JPY' ? 0 : 0,
  }).format(value);
};

export const formatUsdMoney = (usdAmount: number, currency: CurrencyCode, rates = cachedRates || FALLBACK_USD_RATES) =>
  formatMoney(usdAmount, currency, rates);

export const useLocalizedCurrency = (user?: User) => {
  const currency = useMemo(() => currencyForUser(user), [user?.onboarding?.countryCode]);
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(cachedRates || FALLBACK_USD_RATES);

  useEffect(() => {
    let cancelled = false;
    void loadFxRates().then((next) => {
      if (!cancelled) setRates(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { currency, rates, format: (usdAmount: number) => formatUsdMoney(usdAmount, currency, rates) };
};
