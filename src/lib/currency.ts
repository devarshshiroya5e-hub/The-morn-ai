import { useEffect, useMemo, useState } from 'react';
import type { User } from '../types';

export type CurrencyCode = 'USD' | 'INR' | 'AED' | 'GBP' | 'EUR' | 'CAD' | 'AUD' | 'SGD' | 'JPY';
export type ExchangeRates = Record<string, number>;

export const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  US: 'USD', IN: 'INR', AE: 'AED', GB: 'GBP', EU: 'EUR',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', IE: 'EUR',
  CA: 'CAD', AU: 'AUD', SG: 'SGD', JP: 'JPY',
};

const FALLBACK_USD_RATES: ExchangeRates = {
  USD: 1, INR: 86, AED: 3.67, GBP: 0.79, EUR: 0.92,
  CAD: 1.37, AUD: 1.53, SGD: 1.34, JPY: 148,
};

let cachedRates: ExchangeRates | null = null;
let ratePromise: Promise<ExchangeRates> | null = null;

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
  currencyForCountry(user?.onboarding?.countryCode || detectCountryCode());

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

const FALLBACK_CURRENCY_CODES = [
  'USD','EUR','INR','GBP','AED','AUD','CAD','CHF','CNY','HKD','SGD','JPY','NZD','SEK','NOK','DKK',
  'ZAR','BRL','MXN','ARS','CLP','COP','PEN','UYU','PLN','CZK','HUF','RON','BGN','TRY','ILS','SAR',
  'QAR','KWD','BHD','OMR','THB','IDR','MYR','PHP','VND','KRW','TWD','PKR','BDT','LKR','NPR',
  'NGN','KES','GHS','EGP','MAD','DZD','TND','UAH','ISK','RSD','RUB'
];

export const getAllCurrencyCodes = (): string[] => {
  try {
    const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'currency') => string[] };
    const supported = typeof intl.supportedValuesOf === 'function' ? intl.supportedValuesOf('currency') : [];
    return Array.from(new Set([...FALLBACK_CURRENCY_CODES, ...supported]))
      .filter((code) => /^[A-Z]{3}$/.test(code))
      .sort();
  } catch {
    return [...FALLBACK_CURRENCY_CODES].sort();
  }
};

export const getCurrencyOptions = () => {
  try {
    const DisplayNamesCtor = (Intl as any).DisplayNames;
    const displayNames = typeof DisplayNamesCtor === 'function'
      ? new DisplayNamesCtor(['en'], { type: 'currency' })
      : null;
    return getAllCurrencyCodes().map((code) => ({
      code,
      label: code + ' — ' + (displayNames?.of(code) || code),
    }));
  } catch {
    return getAllCurrencyCodes().map((code) => ({ code, label: code }));
  }
};

export const formatAnyCurrency = (amount: number, code: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code.toUpperCase(),
      maximumFractionDigits: code.toUpperCase() === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch {
    return code.toUpperCase() + ' ' + amount.toLocaleString();
  }
};

export const loadFxRates = async (): Promise<ExchangeRates> => {
  if (cachedRates) return cachedRates;
  if (ratePromise) return ratePromise;

  ratePromise = fetch('/api/fx-rates', { credentials: 'same-origin', cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) throw new Error('FX request failed');
      const payload = await response.json() as { rates?: Record<string, number> };
      const next: ExchangeRates = { ...FALLBACK_USD_RATES };
      for (const [code, value] of Object.entries(payload.rates || {})) {
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) next[code.toUpperCase()] = value;
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

export const convertUsd = (usdAmount: number, currency: string, rates: ExchangeRates = cachedRates || FALLBACK_USD_RATES) =>
  Math.round(usdAmount * (rates[currency] || 1));

export const convertLocalToUsd = (localAmount: number, currency: string, rates: ExchangeRates = cachedRates || FALLBACK_USD_RATES) => {
  const rate = rates[currency] || 1;
  return rate > 0 ? Math.round(localAmount / rate) : Math.round(localAmount);
};

export const formatMoney = (amount: number, currency: string, rates: ExchangeRates = cachedRates || FALLBACK_USD_RATES) => {
  const code = currency.toUpperCase();
  if (!rates[code] && code !== 'USD') return formatAnyCurrency(amount, code);
  const value = convertUsd(amount, code, rates);
  return new Intl.NumberFormat(currencyMeta[code as CurrencyCode]?.locale || 'en-US', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: code === 'JPY' ? 0 : 0,
  }).format(value);
};

export const formatUsdMoney = (usdAmount: number, currency: string, rates: ExchangeRates = cachedRates || FALLBACK_USD_RATES) =>
  formatMoney(usdAmount, currency, rates);

export const useLocalizedCurrency = (user?: User) => {
  const currency = useMemo(() => currencyForUser(user), [user?.onboarding?.countryCode]);
  const [rates, setRates] = useState<ExchangeRates>(cachedRates || FALLBACK_USD_RATES);

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
