import { useEffect, useMemo, useState } from 'react';
import type { User } from '../types';

/** ISO currency codes used across MornAI localization. */
export type CurrencyCode = string;
export type ExchangeRates = Record<string, number>;

/**
 * Comprehensive ISO 3166-1 alpha-2 → ISO 4217 currency mapping.
 * Unknown / OTHER falls back to USD in currencyForCountry().
 */
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: 'USD', PR: 'USD', VI: 'USD', GU: 'USD', AS: 'USD', MP: 'USD',
  CA: 'CAD',
  MX: 'MXN', GT: 'GTQ', BZ: 'BZD', SV: 'USD', HN: 'HNL', NI: 'NIO', CR: 'CRC', PA: 'PAB',
  CU: 'CUP', DO: 'DOP', HT: 'HTG', JM: 'JMD', TT: 'TTD', BB: 'BBD', BS: 'BSD',
  AG: 'XCD', DM: 'XCD', GD: 'XCD', KN: 'XCD', LC: 'XCD', VC: 'XCD',
  AR: 'ARS', BO: 'BOB', BR: 'BRL', CL: 'CLP', CO: 'COP', EC: 'USD', GY: 'GYD',
  PY: 'PYG', PE: 'PEN', SR: 'SRD', UY: 'UYU', VE: 'VES',
  GB: 'GBP', IE: 'EUR', IM: 'GBP', JE: 'GBP', GG: 'GBP',
  FR: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR',
  LU: 'EUR', AT: 'EUR', FI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', SK: 'EUR',
  SI: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR', AD: 'EUR', MC: 'EUR', SM: 'EUR', VA: 'EUR',
  EU: 'EUR',
  CH: 'CHF', LI: 'CHF',
  NO: 'NOK', SE: 'SEK', DK: 'DKK', IS: 'ISK', FO: 'DKK', GL: 'DKK',
  PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN',
  RS: 'RSD', BA: 'BAM', MK: 'MKD', AL: 'ALL', ME: 'EUR', XK: 'EUR',
  UA: 'UAH', MD: 'MDL', BY: 'BYN', RU: 'RUB',
  TR: 'TRY', GE: 'GEL', AM: 'AMD', AZ: 'AZN',
  IN: 'INR', PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR', BT: 'BTN', MV: 'MVR',
  AF: 'AFN',
  CN: 'CNY', HK: 'HKD', MO: 'MOP', TW: 'TWD', JP: 'JPY', KR: 'KRW', KP: 'KPW',
  MN: 'MNT',
  SG: 'SGD', MY: 'MYR', ID: 'IDR', TH: 'THB', VN: 'VND', PH: 'PHP',
  KH: 'KHR', LA: 'LAK', MM: 'MMK', BN: 'BND', TL: 'USD',
  AU: 'AUD', NZ: 'NZD', FJ: 'FJD', PG: 'PGK', SB: 'SBD', VU: 'VUV',
  WS: 'WST', TO: 'TOP', TV: 'AUD', KI: 'AUD', NR: 'AUD', NC: 'XPF', PF: 'XPF',
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
  YE: 'YER', IQ: 'IQD', IR: 'IRR', JO: 'JOD', LB: 'LBP', SY: 'SYP', IL: 'ILS', PS: 'ILS',
  EG: 'EGP', LY: 'LYD', TN: 'TND', DZ: 'DZD', MA: 'MAD', EH: 'MAD',
  SD: 'SDG', SS: 'SSP',
  ZA: 'ZAR', NA: 'NAD', BW: 'BWP', ZW: 'ZWL', ZM: 'ZMW', MW: 'MWK', MZ: 'MZN',
  AO: 'AOA', NG: 'NGN', GH: 'GHS', CI: 'XOF', SN: 'XOF', ML: 'XOF', BF: 'XOF',
  NE: 'XOF', TG: 'XOF', BJ: 'XOF', GW: 'XOF',
  CM: 'XAF', CF: 'XAF', TD: 'XAF', CG: 'XAF', GA: 'XAF', GQ: 'XAF',
  KE: 'KES', UG: 'UGX', TZ: 'TZS', RW: 'RWF', BI: 'BIF', ET: 'ETB', SO: 'SOS',
  DJ: 'DJF', ER: 'ERN',
  MR: 'MRU', GM: 'GMD', GN: 'GNF', SL: 'SLE', LR: 'LRD', CV: 'CVE', ST: 'STN',
  SC: 'SCR', MU: 'MUR', KM: 'KMF', MG: 'MGA', RE: 'EUR', YT: 'EUR',
  KZ: 'KZT', UZ: 'UZS', TM: 'TMT', TJ: 'TJS', KG: 'KGS',
};

/** Approximate USD→local fallbacks when live FX is unavailable. */
const FALLBACK_USD_RATES: ExchangeRates = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 96.02, AED: 3.67, CAD: 1.37, AUD: 1.53, SGD: 1.34, JPY: 148,
  CHF: 0.88, CNY: 7.2, HKD: 7.8, NZD: 1.66, SEK: 10.5, NOK: 10.8, DKK: 6.9, PLN: 3.9,
  CZK: 23, HUF: 360, RON: 4.6, BGN: 1.8, TRY: 34, ILS: 3.7, SAR: 3.75, QAR: 3.64,
  KWD: 0.31, BHD: 0.38, OMR: 0.38, THB: 35, IDR: 15800, MYR: 4.5, PHP: 58, VND: 25400,
  KRW: 1350, TWD: 32, PKR: 278, BDT: 120, LKR: 300, NPR: 137, ZAR: 18.2, BRL: 5.6,
  MXN: 18.5, ARS: 980, CLP: 940, COP: 4100, PEN: 3.7, UYU: 41, NGN: 1550, KES: 129,
  GHS: 15.5, EGP: 50, MAD: 9.9, DZD: 134, TND: 3.1, UAH: 41, ISK: 138, RSD: 108,
  RUB: 92, JOD: 0.71, LBP: 89500, IQD: 1310, YER: 250, IRR: 42000, AFN: 70,
  BTN: 86, MVR: 15.4, MOP: 8, KHR: 4100, LAK: 21500, MMK: 2100, BND: 1.34,
  FJD: 2.25, PGK: 3.9, XOF: 600, XAF: 600, XCD: 2.7, XPF: 110, GEL: 2.7, AMD: 390,
  AZN: 1.7, KZT: 480, UZS: 12800, TJS: 10.9, KGS: 87, TMT: 3.5, BYN: 3.3, MDL: 17.5,
  ALL: 92, MKD: 56, BAM: 1.8, NAD: 18.2, BWP: 13.5, ZMW: 27, MWK: 1730, MZN: 64,
  AOA: 900, UGX: 3700, TZS: 2600, RWF: 1350, BIF: 2900, ETB: 125, SOS: 570,
  DJF: 178, MUR: 46, SCR: 14, MGA: 4500, KMF: 450, GMD: 70, GNF: 8600, LRD: 190,
  CVE: 101, STN: 22.5, MRU: 39.7, SLE: 22.5, PAB: 1, CRC: 510, GTQ: 7.7, HNL: 24.7,
  NIO: 36.7, DOP: 60, JMD: 156, TTD: 6.8, BBD: 2, BSD: 1, BZD: 2, HTG: 132,
  CUP: 24, GYD: 209, SRD: 35, BOB: 6.9, PYG: 7800, VES: 40, WST: 2.7, TOP: 2.3,
  SBD: 8.4, VUV: 120, ANG: 1.79, AWG: 1.79, KYD: 0.82, BMD: 1,
};

let cachedRates: ExchangeRates | null = null;
let ratePromise: Promise<ExchangeRates> | null = null;

export const detectCountryCode = () => {
  if (typeof navigator === 'undefined') return 'US';

  try {
    const locale = new Intl.Locale(navigator.language);
    const region = (locale.region || '').toUpperCase();
    if (region && region !== '001' && COUNTRY_TO_CURRENCY[region]) return region;
  } catch {
    /* ignore */
  }

  const language = (navigator.language || '').toLowerCase();
  if (language.includes('-in') || language.startsWith('hi')) return 'IN';

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (timeZone === 'Asia/Kolkata' || timeZone === 'Asia/Calcutta') return 'IN';
    if (timeZone === 'Asia/Dubai') return 'AE';
    if (timeZone === 'Europe/London') return 'GB';
    if (timeZone === 'America/New_York' || timeZone === 'America/Chicago' || timeZone === 'America/Los_Angeles') return 'US';
  } catch {
    /* ignore */
  }

  return 'US';
};

export const currencyForCountry = (countryCode?: string): string => {
  const code = (countryCode || '').toUpperCase();
  if (!code || code === 'OTHER') return 'USD';
  return COUNTRY_TO_CURRENCY[code] || 'USD';
};

export const currencyForUser = (user?: User): string =>
  currencyForCountry(user?.onboarding?.countryCode || detectCountryCode());

export const regionLabelForCountry = (countryCode?: string) => {
  const code = (countryCode || '').toUpperCase();
  if (!code || code === 'OTHER') return 'your region';
  try {
    const DisplayNamesCtor = (Intl as typeof Intl & { DisplayNames?: new (locales: string[], options: { type: 'region' }) => { of: (code: string) => string | undefined } }).DisplayNames;
    if (typeof DisplayNamesCtor === 'function') {
      const names = new DisplayNamesCtor(['en'], { type: 'region' });
      return names.of(code) || code;
    }
  } catch {
    /* ignore */
  }
  return code;
};

export const currencyMeta: Record<string, { locale: string; symbol: string }> = {
  USD: { locale: 'en-US', symbol: '$' },
  INR: { locale: 'en-IN', symbol: '₹' },
  AED: { locale: 'en-AE', symbol: 'د.إ' },
  GBP: { locale: 'en-GB', symbol: '£' },
  EUR: { locale: 'de-DE', symbol: '€' },
  CAD: { locale: 'en-CA', symbol: 'CA$' },
  AUD: { locale: 'en-AU', symbol: 'A$' },
  SGD: { locale: 'en-SG', symbol: 'S$' },
  JPY: { locale: 'ja-JP', symbol: '¥' },
  BRL: { locale: 'pt-BR', symbol: 'R$' },
  ZAR: { locale: 'en-ZA', symbol: 'R' },
  MXN: { locale: 'es-MX', symbol: 'MX$' },
  CHF: { locale: 'de-CH', symbol: 'CHF' },
  CNY: { locale: 'zh-CN', symbol: '¥' },
  KRW: { locale: 'ko-KR', symbol: '₩' },
  SAR: { locale: 'ar-SA', symbol: '﷼' },
  PKR: { locale: 'en-PK', symbol: 'Rs' },
  NGN: { locale: 'en-NG', symbol: '₦' },
  EGP: { locale: 'ar-EG', symbol: 'E£' },
  THB: { locale: 'th-TH', symbol: '฿' },
  IDR: { locale: 'id-ID', symbol: 'Rp' },
  MYR: { locale: 'ms-MY', symbol: 'RM' },
  PHP: { locale: 'en-PH', symbol: '₱' },
  VND: { locale: 'vi-VN', symbol: '₫' },
  HKD: { locale: 'zh-HK', symbol: 'HK$' },
  TWD: { locale: 'zh-TW', symbol: 'NT$' },
  NZD: { locale: 'en-NZ', symbol: 'NZ$' },
  SEK: { locale: 'sv-SE', symbol: 'kr' },
  NOK: { locale: 'nb-NO', symbol: 'kr' },
  DKK: { locale: 'da-DK', symbol: 'kr' },
  PLN: { locale: 'pl-PL', symbol: 'zł' },
  TRY: { locale: 'tr-TR', symbol: '₺' },
  ILS: { locale: 'he-IL', symbol: '₪' },
};

const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'UGX', 'XOF', 'XAF', 'PYG', 'IDR']);

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
    return Array.from(new Set([...FALLBACK_CURRENCY_CODES, ...supported, ...Object.values(COUNTRY_TO_CURRENCY)]))
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

/** Full country picker for signup / profile (ISO list + common extras). */
export const getRegionOptions = (): Array<[string, string]> => {
  const codes = Object.keys(COUNTRY_TO_CURRENCY).sort();
  let names: { of: (code: string) => string | undefined } | null = null;
  try {
    const DisplayNamesCtor = (Intl as any).DisplayNames;
    if (typeof DisplayNamesCtor === 'function') {
      names = new DisplayNamesCtor(['en'], { type: 'region' });
    }
  } catch {
    names = null;
  }

  const options = codes
    .map((code) => [code, names?.of(code) || code] as [string, string])
    .filter(([, label]) => Boolean(label) && label !== '001')
    .sort((a, b) => a[1].localeCompare(b[1]));

  options.push(['OTHER', 'Other / prefer not to say']);
  return options;
};

export const formatAnyCurrency = (amount: number, code: string) => {
  const currency = code.toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2,
    }).format(amount);
  } catch {
    return currency + ' ' + amount.toLocaleString();
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
      cachedRates = { ...FALLBACK_USD_RATES };
      return cachedRates;
    })
    .finally(() => {
      ratePromise = null;
    });

  return ratePromise;
};

const rateFor = (currency: string, rates: ExchangeRates) => {
  const code = currency.toUpperCase();
  if (code === 'USD') return 1;
  return rates[code] || FALLBACK_USD_RATES[code] || 1;
};

export const convertUsd = (usdAmount: number, currency: string, rates: ExchangeRates = cachedRates || FALLBACK_USD_RATES) =>
  Math.round(usdAmount * rateFor(currency, rates));

export const convertLocalToUsd = (localAmount: number, currency: string, rates: ExchangeRates = cachedRates || FALLBACK_USD_RATES) => {
  const rate = rateFor(currency, rates);
  return rate > 0 ? Math.round(localAmount / rate) : Math.round(localAmount);
};

export const formatMoney = (amount: number, currency: string, rates: ExchangeRates = cachedRates || FALLBACK_USD_RATES) => {
  const code = currency.toUpperCase();
  const value = convertUsd(amount, code, rates);
  try {
    return new Intl.NumberFormat(currencyMeta[code]?.locale || (code === 'INR' ? 'en-IN' : undefined), {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol',
      maximumFractionDigits: ZERO_DECIMAL.has(code) ? 0 : 0,
    }).format(value);
  } catch {
    return formatAnyCurrency(value, code);
  }
};

export const formatUsdMoney = (usdAmount: number, currency: string, rates: ExchangeRates = cachedRates || FALLBACK_USD_RATES) =>
  formatMoney(usdAmount, currency, rates);

export const useLocalizedCurrency = (user?: User) => {
  const countryCode = user?.onboarding?.countryCode || detectCountryCode();
  const currency = useMemo(() => currencyForCountry(countryCode), [countryCode]);
  const regionLabel = useMemo(() => regionLabelForCountry(countryCode), [countryCode]);
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

  return {
    currency,
    countryCode,
    regionLabel,
    rates,
    format: (usdAmount: number) => formatUsdMoney(usdAmount, currency, rates),
  };
};
